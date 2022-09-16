import "./openapi/api";
import "reflect-metadata";
import { SendQueue } from "./entity/SendQueue";
import { GroundControlToMajorTom } from "./class/GroundControlToMajorTom";
import { TokenConfiguration } from "./entity/TokenConfiguration";
import { NOTIFICATION_LEVEL_NEWS, NOTIFICATION_LEVEL_PRICE, NOTIFICATION_LEVEL_TIPS, NOTIFICATION_LEVEL_TRANSACTIONS } from "./openapi/constants";
import dataSource from "./data-source";
require("dotenv").config();
if (!process.env.FCM_SERVER_KEY || !process.env.APNS_P8 || !process.env.APNS_TOPIC || !process.env.APPLE_TEAM_ID || !process.env.APNS_P8_KID) {
  console.error("not all env variables set");
  process.exit();
}

process
  .on("unhandledRejection", (reason, p) => {
    console.error(reason, "Unhandled Rejection at Promise", p);
    process.exit(1);
  })
  .on("uncaughtException", (err) => {
    console.error(err, "Uncaught Exception thrown");
    process.exit(1);
  });

dataSource
  .initialize()
  .then(async (connection) => {
    // start worker
    console.log("running groundcontrol worker-sender");
    console.log(require("fs").readFileSync("./bowie.txt").toString("ascii"));

    const sendQueueRepository = dataSource.getRepository(SendQueue);
    const tokenConfigurationRepository = dataSource.getRepository(TokenConfiguration);

    while (1) {
      const [record] = await sendQueueRepository.find();
      if (!record) {
        await new Promise((resolve) => setTimeout(resolve, 1000, false));
        continue;
      }
      // TODO: we could atomically lock this record via mariadb's GET_LOCK and typeorm's raw query, and that would
      //       allow us to run multiple sender workers in parallel
      let payload;
      try {
        payload = JSON.parse(record.data);
      } catch (_) {
        process.env.VERBOSE && console.warn("bad json in data:", record.data);
        await sendQueueRepository.remove(record);
        continue;
      }

      let tokenConfig = await tokenConfigurationRepository.findOneBy({ os: payload.os, token: payload.token });
      if (!tokenConfig) {
        if (!payload.os || !payload.token) {
          process.env.VERBOSE && console.warn("no os or token in payload:", payload);
          await sendQueueRepository.remove(record);
          continue;
        }
        tokenConfig = new TokenConfiguration();
        tokenConfig.os = payload.os;
        tokenConfig.token = payload.token;
        await tokenConfigurationRepository.save(tokenConfig);
      }

      let unsubscribed = false;

      if (!tokenConfig.level_all) unsubscribed = true; // user unsubscribed from all
      switch (payload.level) {
        case NOTIFICATION_LEVEL_TRANSACTIONS:
          if (!tokenConfig.level_transactions) unsubscribed = true;
          break;
        case NOTIFICATION_LEVEL_NEWS:
          if (!tokenConfig.level_news) unsubscribed = true;
          break;
        case NOTIFICATION_LEVEL_PRICE:
          if (!tokenConfig.level_price) unsubscribed = true;
          break;
        case NOTIFICATION_LEVEL_TIPS:
          if (!tokenConfig.level_tips) unsubscribed = true;
          break;
      }

      if (unsubscribed) {
        await sendQueueRepository.remove(record);
        continue;
      }

      const timeoutId = setTimeout(() => {
        console.error("timeout pushing to token, comitting suicide");
        process.exit(2);
      }, 21000);
      switch (payload.type) {
        case 2:
          payload = <Components.Schemas.PushNotificationOnchainAddressGotPaid>payload;
          process.env.VERBOSE && console.warn("pushing to token", payload.token, payload.os);
          await GroundControlToMajorTom.pushOnchainAddressWasPaid(connection, GroundControlToMajorTom.getGoogleServerKey(), GroundControlToMajorTom.getApnsJwtToken(), payload);
          await sendQueueRepository.remove(record);
          break;
        case 3:
          payload = <Components.Schemas.PushNotificationOnchainAddressGotUnconfirmedTransaction>payload;
          process.env.VERBOSE && console.warn("pushing to token", payload.token, payload.os);
          await GroundControlToMajorTom.pushOnchainAddressGotUnconfirmedTransaction(connection, GroundControlToMajorTom.getGoogleServerKey(), GroundControlToMajorTom.getApnsJwtToken(), payload);
          await sendQueueRepository.remove(record);
          break;
        case 1:
          payload = <Components.Schemas.PushNotificationLightningInvoicePaid>payload;
          process.env.VERBOSE && console.warn("pushing to token", payload.token, payload.os);
          await GroundControlToMajorTom.pushLightningInvoicePaid(connection, GroundControlToMajorTom.getGoogleServerKey(), GroundControlToMajorTom.getApnsJwtToken(), payload);
          await sendQueueRepository.remove(record);
          break;
        case 4:
          payload = <Components.Schemas.PushNotificationTxidGotConfirmed>payload;
          process.env.VERBOSE && console.warn("pushing to token", payload.token, payload.os);
          await GroundControlToMajorTom.pushOnchainTxidGotConfirmed(connection, GroundControlToMajorTom.getGoogleServerKey(), GroundControlToMajorTom.getApnsJwtToken(), payload);
          await sendQueueRepository.remove(record);
          break;
      }
      clearTimeout(timeoutId);
    }
  })
  .catch((error) => {
    console.error("exception in sender:", error, "comitting suicide");
    process.exit(1);
  });
