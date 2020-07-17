import "../openapi/api";
import { getRepository } from "typeorm";
import { PushLog } from "../entity/PushLog";
import { TokenToAddress } from "../entity/TokenToAddress";
const Frisbee = require("frisbee");
const http2 = require("http2");
const fs = require("fs");

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
  static async pushOnchainAddressWasPaid(
    serverKey: string,
    apnsPem: string,
    pushNotification: Components.Schemas.PushNotificationOnchainAddressGotPaid
  ): Promise<[object, object]> {
    const fcmPayload = {
      data: {},
      notification: {
        title: "+" + pushNotification.sat + " sats",
        body: "Your received new transfer on: " + pushNotification.address,
        badge: pushNotification.badge,
      },
    };

    const apnsPayload = {
      aps: {
        badge: pushNotification.badge,
        alert: {
          title: "+" + pushNotification.sat + " sats",
          body: "Your received new transfer on: " + pushNotification.address,
        },
        sound: "default",
      },
      data: {},
    };

    if (pushNotification.os === "android") return GroundControlToMajorTom._pushToFcm(serverKey, pushNotification.token, fcmPayload, pushNotification);
    if (pushNotification.os === "ios") return GroundControlToMajorTom._pushToApns(apnsPem, pushNotification.token, apnsPayload, pushNotification);
  }

  static async pushLightningInvoicePaid(
    serverKey: string,
    apnsPem: string,
    pushNotification: Components.Schemas.PushNotificationLightningInvoicePaid
  ): Promise<[object, object]> {
    const fcmPayload = {
      data: {},
      notification: {
        body: "Paid: " + (pushNotification.memo || "your invoice"),
        title: "+" + pushNotification.sat + " sats",
        badge: pushNotification.badge,
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
    if (pushNotification.os === "ios") return GroundControlToMajorTom._pushToApns(apnsPem, pushNotification.token, apnsPayload, pushNotification);
  }

  protected static async _pushToApns(
    apnsPem: string,
    token: string,
    apnsPayload: object,
    pushNotification: Components.Schemas.PushNotificationBase
  ): Promise<[object, object]> {
    return new Promise(function (resolve) {
      for (let dataKey of Object.keys(pushNotification)) {
        if (["token", "os", "badge"].includes(dataKey)) continue;
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
        "apns-topic": "io.bluewallet.bluewallet",
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

  protected static async _pushToFcm(
    serverKey: string,
    token: string,
    fcmPayload: object,
    pushNotification: Components.Schemas.PushNotificationBase
  ): Promise<[object, object]> {
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
}
