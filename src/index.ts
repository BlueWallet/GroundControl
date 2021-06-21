import "reflect-metadata";
import { createConnection } from "typeorm";
import * as express from "express";
import * as bodyParser from "body-parser";
import { Request, Response } from "express";
import { Routes } from "./routes";
require("dotenv").config();
const helmet = require("helmet");
const cors = require("cors");
const url = require("url");
const parsed = url.parse(process.env.JAWSDB_MARIA_URL);
if (!process.env.JAWSDB_MARIA_URL || !process.env.FCM_SERVER_KEY || !process.env.APNS_PEM || !process.env.APNS_TOPIC) {
  console.error("not all env variables set");
  process.exit();
}

createConnection({
  type: "mariadb",
  host: parsed.hostname,
  port: parsed.port,
  username: parsed.auth.split(":")[0],
  password: parsed.auth.split(":")[1],
  database: parsed.path.replace("/", ""),
  synchronize: true,
  logging: false,
  entities: ["src/entity/**/*.ts"],
  migrations: ["src/migration/**/*.ts"],
  subscribers: ["src/subscriber/**/*.ts"],
  cli: {
    entitiesDir: "src/entity",
    migrationsDir: "src/migration",
    subscribersDir: "src/subscriber",
  },
})
  .then(async (connection) => {
    // create express app
    const app = express();
    app.use(bodyParser.json());
    app.use(cors());
    app.use(helmet.hidePoweredBy());
    app.use(helmet.hsts());

    // register express routes from defined application routes
    Routes.forEach((route) => {
      (app as any)[route.method](route.route, (req: Request, res: Response, next: Function) => {
        const result = new (route.controller as any)()[route.action](req, res, next);
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

    console.log("Express server has started on port ", process.env.PORT || 3001);
  })
  .catch((error) => console.log(error));
