import "reflect-metadata";
import * as express from "express";
import * as bodyParser from "body-parser";
import { Request, Response } from "express";
import { Routes } from "./routes";
import dataSource from "./data-source";
import { PushLog } from "./entity/PushLog";
import { TokenToTxid } from "./entity/TokenToTxid";
import { TokenToAddress } from "./entity/TokenToAddress";
import { DataSource } from "typeorm";
import { ADDRESS_IGNORE_LIST } from "./address-ignore-list";
require("dotenv").config();
const helmet = require("helmet");
const cors = require("cors");
if (!process.env.JAWSDB_MARIA_URL || !process.env.GOOGLE_KEY_FILE || !process.env.APNS_P8 || !process.env.APNS_TOPIC || !process.env.GOOGLE_PROJECT_ID) {
  console.error("not all env variables set");
  process.exit();
}

let connection: DataSource;

const pushLogPurge = () => {
  console.log("purging PushLog...");
  let today = new Date();
  connection
    .createQueryBuilder()
    .delete()
    .from(PushLog)
    .where("created <= :currentDate", { currentDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000) })
    .execute()
    .then(() => console.log("PushLog purged ok"))
    .catch((error) => console.log("error purging PushLog:", error));
};

const purgeOldTxidSubscriptions = () => {
  console.log("purging TokenToTxid...");
  let today = new Date();
  connection
    .createQueryBuilder()
    .delete()
    .from(TokenToTxid)
    .where("created <= :currentDate", { currentDate: new Date(today.getTime() - 3 * 30 * 24 * 60 * 60 * 1000) }) // 3 mo
    .execute()
    .then(() => console.log("TokenToTxid purged ok"))
    .catch((error) => console.log("error purging TokenToTxid:", error));
};

const purgeIgnoredAddressesSubscriptions = () => {
  console.log("Purging addresses subscriptions...");
  connection
    .createQueryBuilder()
    .delete()
    .from(TokenToAddress)
    .where("address IN (:...id)", { id: ADDRESS_IGNORE_LIST })
    .execute()
    .then(() => console.log("Addresses subscriptions purged ok"))
    .catch((error) => console.log("error purging addresses subscriptions:", error));
};

const killSleepingMySQLProcesses = () => {
  console.log("Checking for sleeping MySQL processes...");

  // Query to find processes sleeping for too long
  const query = `
    SELECT id, user, host, db, command, time, state, info
    FROM information_schema.processlist 
    WHERE command = 'Sleep' AND time > 100 AND id != CONNECTION_ID()
  `;

  connection
    .query(query)
    .then((sleepingProcesses: any[]) => {
      if (sleepingProcesses.length > 0) {
        console.log(`Found ${sleepingProcesses.length} old sleeping processes`);

        // Kill each sleeping process
        const killPromises = sleepingProcesses.map((process) => {
          console.log(`Killing process ID ${process.id} (user: ${process.user}, host: ${process.host}, sleeping for ${process.time}s)`);
          return connection
            .query(`KILL ${process.id}`)
            .then(() => console.log(`Successfully killed process ${process.id}`))
            .catch((error) => console.log(`Error killing process ${process.id}:`, error.message));
        });

        return Promise.all(killPromises);
      } else {
        console.log("No old sleeping processes found");
      }
    })
    .catch((error) => {
      console.log("Error checking sleeping processes:", error.message);
    });
};

dataSource
  .initialize()
  .then(async (c) => {
    console.log("db connected");

    connection = c;
    purgeIgnoredAddressesSubscriptions();
    pushLogPurge();
    purgeOldTxidSubscriptions();
    killSleepingMySQLProcesses();
    setInterval(pushLogPurge, 3600 * 1000);
    setInterval(killSleepingMySQLProcesses, 100 * 1000);

    // create express app
    const app = express();
    app.use(bodyParser.json());
    app.use(cors());
    app.use(helmet.hidePoweredBy());
    app.use(helmet.hsts());

    // register express routes from defined application routes
    Routes.forEach((route) => {
      (app as any)[route.method](route.route, (req: Request, res: Response, next: Function) => {
        const result = new (route.controller as any)(c)[route.action](req, res, next);
        if (result instanceof Promise) {
          result.then((result) => (result !== null && result !== undefined ? res.send(result) : undefined));
        } else if (result !== null && result !== undefined) {
          res.json(result);
        }
      });
    });

    app.set("trust proxy", 1);
    const rateLimit = require("express-rate-limit");
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
    });
    app.use(limiter);

    app.listen(process.env.PORT || 3001);

    console.log(require("fs").readFileSync("./bowie.txt").toString("ascii"));
    console.log("GroundControl server has started on port ", process.env.PORT || 3001);
  })
  .catch((error) => console.log(error));
