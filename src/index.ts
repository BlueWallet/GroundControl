import "reflect-metadata";
import * as express from "express";
import * as bodyParser from "body-parser";
import { Request, Response } from "express";
import { Routes } from "./routes";
import dataSource from "./data-source";
require("dotenv").config();
const helmet = require("helmet");
const cors = require("cors");
if (!process.env.JAWSDB_MARIA_URL || !process.env.FCM_SERVER_KEY || !process.env.APNS_P8 || !process.env.APNS_TOPIC) {
  console.error("not all env variables set");
  process.exit();
}

dataSource
  .initialize()
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

    console.log(require("fs").readFileSync("./bowie.txt").toString("ascii"));
    console.log("GroundControl server has started on port ", process.env.PORT || 3001);
  })
  .catch((error) => console.log(error));
