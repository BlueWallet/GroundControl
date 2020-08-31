import "../openapi/api";
import { getRepository, getConnection } from "typeorm";
import { PushLog } from "../entity/PushLog";
import { TokenToAddress } from "../entity/TokenToAddress";
import { TokenToHash } from "../entity/TokenToHash";
import { TokenToTxid } from "../entity/TokenToTxid";
const Frisbee = require("frisbee");
const http2 = require("http2");

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
  static async pushOnchainAddressGotUnconfirmedTransaction(serverKey: string, apnsPem: string, pushNotification: Components.Schemas.PushNotificationOnchainAddressGotUnconfirmedTransaction): Promise<[object, object]> {
    const fcmPayload = {
      data: {},
      notification: {
        title: "New unconfirmed transaction",
        body: "You received new transfer on " + GroundControlToMajorTom.shortenAddress(pushNotification.address),
        badge: pushNotification.badge,
        tag: pushNotification.txid,
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

    if (pushNotification.os === "android") return GroundControlToMajorTom._pushToFcm(serverKey, pushNotification.token, fcmPayload, pushNotification);
    if (pushNotification.os === "ios") return GroundControlToMajorTom._pushToApns(apnsPem, pushNotification.token, apnsPayload, pushNotification, pushNotification.txid);
  }

  static async pushOnchainTxidGotConfirmed(serverKey: string, apnsPem: string, pushNotification: Components.Schemas.PushNotificationTxidGotConfirmed): Promise<[object, object]> {
    const fcmPayload = {
      data: {},
      notification: {
        title: "Transaction - Confirmed",
        body: "Your transaction " + GroundControlToMajorTom.shortenTxid(pushNotification.txid) + " has been confirmed",
        badge: pushNotification.badge,
        tag: pushNotification.txid,
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

    if (pushNotification.os === "android") return GroundControlToMajorTom._pushToFcm(serverKey, pushNotification.token, fcmPayload, pushNotification);
    if (pushNotification.os === "ios") return GroundControlToMajorTom._pushToApns(apnsPem, pushNotification.token, apnsPayload, pushNotification, pushNotification.txid);
  }

  static async pushOnchainAddressWasPaid(serverKey: string, apnsPem: string, pushNotification: Components.Schemas.PushNotificationOnchainAddressGotPaid): Promise<[object, object]> {
    const fcmPayload = {
      data: {},
      notification: {
        title: "+" + pushNotification.sat + " sats",
        body: "Received on " + GroundControlToMajorTom.shortenAddress(pushNotification.address),
        badge: pushNotification.badge,
        tag: pushNotification.txid,
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

    if (pushNotification.os === "android") return GroundControlToMajorTom._pushToFcm(serverKey, pushNotification.token, fcmPayload, pushNotification);
    if (pushNotification.os === "ios") return GroundControlToMajorTom._pushToApns(apnsPem, pushNotification.token, apnsPayload, pushNotification, pushNotification.txid);
  }

  static async pushLightningInvoicePaid(serverKey: string, apnsPem: string, pushNotification: Components.Schemas.PushNotificationLightningInvoicePaid): Promise<[object, object]> {
    const fcmPayload = {
      data: {},
      notification: {
        body: "Paid: " + (pushNotification.memo || "your invoice"),
        title: "+" + pushNotification.sat + " sats",
        badge: pushNotification.badge,
        tag: pushNotification.hash,
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

    if (pushNotification.os === "android") return GroundControlToMajorTom._pushToFcm(serverKey, pushNotification.token, fcmPayload, pushNotification);
    if (pushNotification.os === "ios") return GroundControlToMajorTom._pushToApns(apnsPem, pushNotification.token, apnsPayload, pushNotification, pushNotification.hash);
  }

  protected static async _pushToApns(apnsPem: string, token: string, apnsPayload: object, pushNotification: Components.Schemas.PushNotificationBase, collapseId): Promise<[object, object]> {
    return new Promise(function (resolve) {
      // we pass some of the notification properties as data properties to FCM payload:
      for (let dataKey of Object.keys(pushNotification)) {
        if (["token", "os", "badge", "level"].includes(dataKey)) continue;
        apnsPayload["data"][dataKey] = pushNotification[dataKey];
      }
      const pemBuffer = Buffer.from(apnsPem, "hex");
      const client = http2.connect("https://api.push.apple.com", {
        key: pemBuffer,
        cert: pemBuffer,
      });
      client.on("error", (err) => console.error(err));
      const headers = {
        ":method": "POST",
        "apns-topic": process.env.APNS_TOPIC,
        "apns-collapse-id": collapseId,
        "apns-expiration": Math.floor(+new Date() / 1000 + 3600 * 24),
        ":scheme": "https",
        ":path": "/3/device/" + token,
      };
      const request = client.request(headers);

      let responseJson = {};
      request.on("response", (headers, flags) => {
        for (const name in headers) {
          responseJson[name] = headers[name];
        }
      });

      request.setEncoding("utf8");

      let data = "";
      request.on("data", (chunk) => {
        data += chunk;
      });
      request.write(JSON.stringify(apnsPayload));
      request.on("end", () => {
        responseJson["data"] = data;
        client.close();

        GroundControlToMajorTom.processApnsResponse(responseJson, token);

        const PushLogRepository = getRepository(PushLog);
        PushLogRepository.save({
          token: token,
          os: "ios",
          payload: JSON.stringify(apnsPayload),
          response: JSON.stringify(responseJson),
          success: responseJson[":status"] === 200,
        });

        resolve([apnsPayload, responseJson]);
      });
      request.end();
    });
  }

  protected static async _pushToFcm(serverKey: string, token: string, fcmPayload: object, pushNotification: Components.Schemas.PushNotificationBase): Promise<[object, object]> {
    const _api = new Frisbee({ baseURI: "https://fcm.googleapis.com" });

    fcmPayload["to"] = token;
    fcmPayload["priority"] = "high";

    // now, we pass some of the notification properties as data properties to FCM payload:
    for (let dataKey of Object.keys(pushNotification)) {
      if (["token", "os", "badge"].includes(dataKey)) continue;
      fcmPayload["data"][dataKey] = pushNotification[dataKey];
    }

    const apiResponse = await _api.post(
      "/fcm/send",
      Object.assign(
        {},
        {
          headers: {
            Authorization: "key=" + serverKey,
            "Content-Type": "application/json",
            Host: "fcm.googleapis.com",
          },
          body: fcmPayload,
        }
      )
    );

    let responseJson = {};
    if (typeof apiResponse.body === "object") responseJson = apiResponse.body;
    delete fcmPayload["to"]; // compacting a bit, we dont need token in payload as well

    GroundControlToMajorTom.processFcmResponse(responseJson, token);

    const PushLogRepository = getRepository(PushLog);
    await PushLogRepository.save({
      token: token,
      os: "android",
      payload: JSON.stringify(fcmPayload),
      response: JSON.stringify(responseJson),
      success: !!responseJson["success"],
    });

    return [fcmPayload, responseJson];
  }

  static async killDeadToken(token: string) {
    console.log("deleting dead token", token);
    await getRepository(TokenToAddress).createQueryBuilder().delete().where("token = :token", { token }).execute();
    await getRepository(TokenToTxid).createQueryBuilder().delete().where("token = :token", { token }).execute();
    await getRepository(TokenToHash).createQueryBuilder().delete().where("token = :token", { token }).execute();
  }

  static processFcmResponse(response, token: string) {
    if (response && response.results && Array.isArray(response.results) && response.results.length === 1) {
      if (response.results[0] && response.results[0].error && ["NotRegistered"].includes(response.results[0].error)) {
        return GroundControlToMajorTom.killDeadToken(token);
      }
    } else if (response && response.results && Array.isArray(response.results) && response.results.length !== 1) {
      console.error("Expected only single result in FCM response, cant handle batch responses yet (zero response also means smth is wrong):", response);
    }
  }

  static processApnsResponse(response, token: string) {
    if (response && response.data) {
      try {
        const data = JSON.parse(response.data);
        if (data && data.reason && ["Unregistered", "BadDeviceToken"].includes(data.reason)) return GroundControlToMajorTom.killDeadToken(token);
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
