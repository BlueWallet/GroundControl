import { GoogleAuth } from "google-auth-library";
import { DataSource } from "typeorm";
import { PushLog } from "../entity/PushLog";
import { TokenToAddress } from "../entity/TokenToAddress";
import { TokenToHash } from "../entity/TokenToHash";
import { TokenToTxid } from "../entity/TokenToTxid";
import { components } from "../openapi/api";
const jwt = require("jsonwebtoken");
const http2 = require("http2");
require("dotenv").config();

if (!process.env.APNS_P8 || !process.env.APPLE_TEAM_ID || !process.env.APNS_P8_KID || !process.env.GOOGLE_KEY_FILE || !process.env.GOOGLE_PROJECT_ID) {
  console.error("not all env variables set");
  process.exit();
}

const keyFileStr = Buffer.from(process.env.GOOGLE_KEY_FILE, "hex").toString("ascii");
require("fs").writeFileSync("/tmp/google_key_file.json", keyFileStr, { encoding: "ascii" });
const auth = new GoogleAuth({
  keyFile: "/tmp/google_key_file.json",
  scopes: "https://www.googleapis.com/auth/cloud-platform",
});

/**
 * Since we cant attach any code to openapi schema definition, this is a repository of transforming pushnotification object
 * (thats created from apenapi schema) to actual payload thats gona be pushed to fcm/apns. In most basic case we would
 * need to only fill title/body according to user language.
 *
 * One method per each notification type.
 *
 * @see https://dev.to/jakubkoci/react-native-push-notifications-313i
 * @see https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/sending_notification_requests_to_apns
 * @see https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/generating_a_remote_notification
 * @see https://firebase.google.com/docs/cloud-messaging/http-server-ref
 */
export class GroundControlToMajorTom {
  protected static _jwtToken: string = "";
  protected static _jwtTokenMicroTimestamp: number = 0;

  static async getGoogleCredentials() {
    const client = await auth.getClient();
    const accessTokenResponse = await client.getAccessToken();
    return accessTokenResponse.token; // `accessTokenResponse.token` contains the short-lived access token
  }

  static getApnsJwtToken(): string {
    if (+new Date() - GroundControlToMajorTom._jwtTokenMicroTimestamp < 1800 * 1000) {
      return GroundControlToMajorTom._jwtToken;
    }

    const key = Buffer.from(process.env.APNS_P8, "hex").toString("utf8");
    const jwtToken = jwt.sign(
      {
        iss: process.env.APPLE_TEAM_ID, // "team ID" of your developer account
        iat: Math.round(+new Date() / 1000),
      },
      key,
      {
        header: {
          alg: "ES256",
          kid: process.env.APNS_P8_KID, // issuer key which is "key ID" of your p8 file
        },
      }
    );

    GroundControlToMajorTom._jwtTokenMicroTimestamp = +new Date();
    GroundControlToMajorTom._jwtToken = jwtToken;

    return jwtToken;
  }

  static async pushOnchainAddressGotUnconfirmedTransaction(
    dataSource: DataSource,
    serverKey: string,
    apnsP8: string,
    pushNotification: components["schemas"]["PushNotificationOnchainAddressGotUnconfirmedTransaction"]
  ): Promise<void> {
    const fcmPayload = {
      message: {
        token: "",
        data: {
          badge: String(pushNotification.badge),
          tag: pushNotification.txid,
        },
        notification: {
          title: "New unconfirmed transaction",
          body: "You received new transfer on " + GroundControlToMajorTom.shortenAddress(pushNotification.address),
        },
      },
    };

    const apnsPayload = {
      aps: {
        badge: pushNotification.badge,
        alert: {
          title: "New Transaction - Pending",
          body: "Received transaction on " + GroundControlToMajorTom.shortenAddress(pushNotification.address),
        },
        sound: "default",
      },
      data: {},
    };

    if (pushNotification.os === "android") return GroundControlToMajorTom._pushToFcm(dataSource, serverKey, pushNotification.token, fcmPayload, pushNotification);
    if (pushNotification.os === "ios") return GroundControlToMajorTom._pushToApns(dataSource, apnsP8, pushNotification.token, apnsPayload, pushNotification, pushNotification.txid);
  }

  static async pushOnchainTxidGotConfirmed(dataSource: DataSource, serverKey: string, apnsP8: string, pushNotification: components["schemas"]["PushNotificationTxidGotConfirmed"]): Promise<void> {
    const fcmPayload = {
      message: {
        data: {
          badge: String(pushNotification.badge),
          tag: pushNotification.txid,
        },
        notification: {
          title: "Transaction - Confirmed",
          body: "Your transaction " + GroundControlToMajorTom.shortenTxid(pushNotification.txid) + " has been confirmed",
        },
      },
    };

    const apnsPayload = {
      aps: {
        badge: pushNotification.badge,
        alert: {
          title: "Transaction - Confirmed",
          body: "Your transaction " + GroundControlToMajorTom.shortenTxid(pushNotification.txid) + " has been confirmed",
        },
        sound: "default",
      },
      data: {},
    };

    if (pushNotification.os === "android") return GroundControlToMajorTom._pushToFcm(dataSource, serverKey, pushNotification.token, fcmPayload, pushNotification);
    if (pushNotification.os === "ios") return GroundControlToMajorTom._pushToApns(dataSource, apnsP8, pushNotification.token, apnsPayload, pushNotification, pushNotification.txid);
  }

  static async pushMessage(dataSource: DataSource, serverKey: string, apnsP8: string, pushNotification: components["schemas"]["PushNotificationMessage"]): Promise<void> {
    const fcmPayload = {
      message: {
        data: {},
        notification: {
          title: "Message",
          body: pushNotification.text,
        },
      },
    };

    const apnsPayload = {
      aps: {
        badge: pushNotification.badge,
        alert: {
          title: "Message",
          body: pushNotification.text,
        },
        sound: "default",
      },
      data: {},
    };

    if (pushNotification.os === "android") return GroundControlToMajorTom._pushToFcm(dataSource, serverKey, pushNotification.token, fcmPayload, pushNotification);
    if (pushNotification.os === "ios") return GroundControlToMajorTom._pushToApns(dataSource, apnsP8, pushNotification.token, apnsPayload, pushNotification, pushNotification.txid);
  }

  static async pushOnchainAddressWasPaid(dataSource: DataSource, serverKey: string, apnsP8: string, pushNotification: components["schemas"]["PushNotificationOnchainAddressGotPaid"]): Promise<void> {
    const fcmPayload = {
      message: {
        token: "",
        data: {
          badge: String(pushNotification.badge),
          tag: pushNotification.txid,
        },
        notification: {
          title: "+" + pushNotification.sat + " sats",
          body: "Received on " + GroundControlToMajorTom.shortenAddress(pushNotification.address),
        },
      },
    };

    const apnsPayload = {
      aps: {
        badge: pushNotification.badge,
        alert: {
          title: "+" + pushNotification.sat + " sats",
          body: "Received on " + GroundControlToMajorTom.shortenAddress(pushNotification.address),
        },
        sound: "default",
      },
      data: {},
    };

    if (pushNotification.os === "android") return GroundControlToMajorTom._pushToFcm(dataSource, serverKey, pushNotification.token, fcmPayload, pushNotification);
    if (pushNotification.os === "ios") return GroundControlToMajorTom._pushToApns(dataSource, apnsP8, pushNotification.token, apnsPayload, pushNotification, pushNotification.txid);
  }

  static async pushLightningInvoicePaid(dataSource: DataSource, serverKey: string, apnsP8: string, pushNotification: components["schemas"]["PushNotificationLightningInvoicePaid"]): Promise<void> {
    const fcmPayload = {
      message: {
        data: {
          badge: String(pushNotification.badge),
          tag: pushNotification.hash,
        },
        notification: {
          body: "Paid: " + (pushNotification.memo || "your invoice"),
          title: "+" + pushNotification.sat + " sats",
        },
      },
    };

    const apnsPayload = {
      aps: {
        badge: pushNotification.badge,
        alert: {
          title: "+" + pushNotification.sat + " sats",
          body: "Paid: " + (pushNotification.memo || "your invoice"),
        },
        sound: "default",
      },
      data: {},
    };

    if (pushNotification.os === "android") return GroundControlToMajorTom._pushToFcm(dataSource, serverKey, pushNotification.token, fcmPayload, pushNotification);
    if (pushNotification.os === "ios") return GroundControlToMajorTom._pushToApns(dataSource, apnsP8, pushNotification.token, apnsPayload, pushNotification, pushNotification.hash);
  }

  protected static async _pushToApns(dataSource: DataSource, apnsP8: string, token: string, apnsPayload: object, pushNotification: components["schemas"]["PushNotificationBase"], collapseId): Promise<void> {
    return new Promise(function (resolve) {
      // we pass some of the notification properties as data properties to FCM payload:
      for (let dataKey of Object.keys(pushNotification)) {
        if (["token", "os", "badge", "level"].includes(dataKey)) continue;
        apnsPayload["data"][dataKey] = pushNotification[dataKey];
      }
      const client = http2.connect("https://api.push.apple.com");
      client.on("error", (err) => console.error(err));
      const headers = {
        ":method": "POST",
        "apns-topic": process.env.APNS_TOPIC,
        "apns-collapse-id": collapseId,
        "apns-expiration": Math.floor(+new Date() / 1000 + 3600 * 24),
        ":scheme": "https",
        ":path": "/3/device/" + token,
        authorization: `bearer ${apnsP8}`,
      };
      const request = client.request(headers);

      let responseJson = {};
      request.on("response", (headers, flags) => {
        for (const name in headers) {
          responseJson[name] = headers[name];
        }
      });
      request.on("error", (err) => {
        console.error("Apple push error:", err);

        const responseJson = {};
        responseJson["error"] = err;
        client.close();

        const PushLogRepository = dataSource.getRepository(PushLog);
        PushLogRepository.save({
          token: token,
          os: "ios",
          payload: JSON.stringify(apnsPayload),
          response: JSON.stringify(responseJson),
          success: responseJson[":status"] === 200,
        });

        resolve();
      });

      request.setEncoding("utf8");

      let data = "";
      request.on("data", (chunk) => {
        data += chunk;
      });
      request.write(JSON.stringify(apnsPayload));
      request.on("end", () => {
        if (Object.keys(responseJson).length === 0) {
          return;
        }
        responseJson["data"] = data;
        client.close();

        GroundControlToMajorTom.processApnsResponse(dataSource, responseJson, token);

        const PushLogRepository = dataSource.getRepository(PushLog);
        PushLogRepository.save({
          token: token,
          os: "ios",
          payload: JSON.stringify(apnsPayload),
          response: JSON.stringify(responseJson),
          success: responseJson[":status"] === 200,
        });

        resolve();
      });
      request.end();
    });
  }

  protected static async _pushToFcm(dataSource: DataSource, bearer: string, token: string, fcmPayload: object, pushNotification: components["schemas"]["PushNotificationBase"]): Promise<void> {
    fcmPayload["message"]["token"] = token;

    // now, we pass some of the notification properties as data properties to FCM payload:
    for (let dataKey of Object.keys(pushNotification)) {
      if (["token", "os", "badge"].includes(dataKey)) continue;
      fcmPayload["message"]["data"][dataKey] = String(pushNotification[dataKey]);
    }

    // @ts-ignore
    const rawResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/messages:send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(Object.assign({}, fcmPayload)),
    });

    let responseText: string;
    try {
      responseText = await rawResponse.text();
    } catch (error) {
      console.error("error getting response from FCM", error);
    }

    delete fcmPayload["message"]["token"]; // compacting a bit, we dont need token in payload as well

    const success = GroundControlToMajorTom.processFcmResponse(dataSource, responseText, token);

    const PushLogRepository = dataSource.getRepository(PushLog);
    await PushLogRepository.save({
      token: token,
      os: "android",
      payload: JSON.stringify(fcmPayload),
      response: responseText,
      success,
    });
  }

  static async killDeadToken(dataSource: DataSource, token: string) {
    console.log("deleting dead token", token);
    await dataSource.getRepository(TokenToAddress).createQueryBuilder().delete().where("token = :token", { token }).execute();
    await dataSource.getRepository(TokenToTxid).createQueryBuilder().delete().where("token = :token", { token }).execute();
    await dataSource.getRepository(TokenToHash).createQueryBuilder().delete().where("token = :token", { token }).execute();
  }

  static processFcmResponse(dataSource: DataSource, responseText: string, token: string): boolean {
    try {
      const response = JSON.parse(responseText);

      if (response?.error) {
        if (response.error.code === 404) {
          GroundControlToMajorTom.killDeadToken(dataSource, token);
          return false;
        }

        // additonal check for the same thing, just for any case
        if (Array.isArray(response?.error?.details)) {
          for (const detail of response.error.details) {
            if (detail.errorCode === "UNREGISTERED") {
              GroundControlToMajorTom.killDeadToken(dataSource, token);
              return false;
            }
          }
        }
      }

      if (response?.name) {
        // thats a sign that payload is accepted and might be delivered
        return true;
      }
    } catch (_) {
      console.error("error parsing FCM response", responseText);
      return false;
    }

    return false;
  }

  static processApnsResponse(dataSource: DataSource, response, token: string) {
    if (response && response.data) {
      try {
        console.log("parsing", response.data);
        const data = JSON.parse(response.data);
        if (data && data.reason && ["Unregistered", "BadDeviceToken", "DeviceTokenNotForTopic"].includes(data.reason)) return GroundControlToMajorTom.killDeadToken(dataSource, token);
      } catch (_) {}
    }
  }

  static shortenAddress(address) {
    if (address.length < 10) return address;
    return address.substring(0, 5) + "...." + address.substring(address.length - 4);
  }

  static shortenTxid(txid) {
    return GroundControlToMajorTom.shortenAddress(txid);
  }
}
