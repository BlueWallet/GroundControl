import "../openapi/api";
import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { TokenToAddress } from "../entity/TokenToAddress";
import { TokenToHash } from "../entity/TokenToHash";
import { TokenToTxid } from "../entity/TokenToTxid";
import { TokenConfiguration } from "../entity/TokenConfiguration";
import { SendQueue } from "../entity/SendQueue";
import { KeyValue } from "../entity/KeyValue";
require("dotenv").config();
const pck = require("../../package.json");
if (!process.env.JAWSDB_MARIA_URL || !process.env.FCM_SERVER_KEY || !process.env.APNS_PEM) {
  console.error("not all env variables set");
  process.exit();
}

const LAST_PROCESSED_BLOCK = "LAST_PROCESSED_BLOCK";

const ADDRESS_IGNORE_LIST = [
  "bc1qltxjty7xfrnkzlrhmxpcekknr3uncne8sht7rn",
  "bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej",
  "bc1qw8wrek2m7nlqldll66ajnwr9mh64syvkt67zlu",
  "1111111111111111111114oLvT2",
  "1BrasiLb2KMbdtuhb1chAVnS2FvcNGfV9J",
  "1GQdrgqAbkeEPUef1UpiTc4X1mUHMcyuGW",
  "1KHwtS5mn7NMUm7Ls7Y1XwxLqMriLdaGbX",
];

export class GroundController {
  private tokenToAddressRepository = getRepository(TokenToAddress);
  private tokenToHashRepository = getRepository(TokenToHash);
  private tokenToTxidRepository = getRepository(TokenToTxid);
  private tokenConfigurationRepository = getRepository(TokenConfiguration);
  private sendQueueRepository = getRepository(SendQueue);

  /**
   * Submit bitcoin addressess that you wish to be notified about to specific push token. Token serves as unique identifier of a device/user. Also, OS of the token
   *
   * @param request
   * @param response
   * @param next
   */
  async majorTomToGroundControl(request: Request, response: Response, next: NextFunction) {
    const body: Paths.MajorTomToGroundControl.Post.RequestBody = request.body;
    // todo: checks that we are receiving data and that there are not too much records in it (probably 1000 addresses for a start is enough)

    if (!body.addresses || !Array.isArray(body.addresses)) {
      body.addresses = [];
    }
    if (!body.hashes || !Array.isArray(body.hashes)) {
      body.hashes = [];
    }
    if (!body.txids || !Array.isArray(body.txids)) {
      body.txids = [];
    }

    if (!body.token || !body.os) {
      response.status(500).send("token not provided");
      return;
    }

    // todo: refactor into single batch save
    for (const address of body.addresses) {
      if (ADDRESS_IGNORE_LIST.includes(address)) {
        continue;
      }

      // todo: validate bitcoin address
      console.log(body.token, "->", address);
      try {
        await this.tokenToAddressRepository.save({
          address,
          token: body.token,
          os: body.os,
        });
      } catch (_) {}
    }

    // todo: refactor into single batch save
    for (const hash of body.hashes) {
      // todo: validate hash
      console.log(body.token, "->", hash);
      try {
        await this.tokenToHashRepository.save({
          hash,
          token: body.token,
          os: body.os,
        });
      } catch (_) {}
    }

    // todo: refactor into single batch save
    for (const txid of body.txids) {
      // todo: validate txid
      console.log(body.token, "->", txid);
      try {
        await this.tokenToTxidRepository.save({
          txid,
          token: body.token,
          os: body.os,
        });
      } catch (_) {}
    }
    response.status(201).send("");
  }

  async unsubscribe(request: Request, response: Response, next: NextFunction) {
    const body: Paths.Unsubscribe.Post.RequestBody = request.body;
    // todo: checks that we are receiving data and that there are not too much records in it (probably 1000 addresses for a start is enough)

    if (!body.addresses || !Array.isArray(body.addresses)) {
      body.addresses = [];
    }
    if (!body.hashes || !Array.isArray(body.hashes)) {
      body.hashes = [];
    }
    if (!body.txids || !Array.isArray(body.txids)) {
      body.txids = [];
    }

    if (!body.token || !body.os) {
      response.status(500).send("token not provided");
      return;
    }

    for (const address of body.addresses) {
      try {
        const addressRecord = await this.tokenToAddressRepository.findOne({ os: body.os, token: body.token, address });
        await this.tokenToAddressRepository.remove(addressRecord);
      } catch (_) {}
    }

    for (const hash of body.hashes) {
      try {
        const hashRecord = await this.tokenToHashRepository.findOne({ os: body.os, token: body.token, hash });
        await this.tokenToHashRepository.remove(hashRecord);
      } catch (_) {}
    }

    for (const txid of body.txids) {
      try {
        const txidRecord = await this.tokenToTxidRepository.findOne({ os: body.os, token: body.token, txid });
        await this.tokenToTxidRepository.remove(txidRecord);
      } catch (_) {}
    }

    response.status(201).send("");
  }

  /**
   * POST request handler that notifies us that specific ln invoice was paid
   *
   * @param request
   * @param response
   * @param next
   */
  async lightningInvoiceGotSettled(request: Request, response: Response, next: NextFunction) {
    const body: Paths.LightningInvoiceGotSettled.Post.RequestBody = request.body;

    const hashShouldBe = require("crypto").createHash("sha256").update(Buffer.from(body.preimage, "hex")).digest("hex");
    if (hashShouldBe !== body.hash) {
      response.status(500).send("preimage doesnt match hash");
      return;
    }

    const tokenToHashAll = await this.tokenToHashRepository.find({
      hash: hashShouldBe,
    });
    for (const tokenToHash of tokenToHashAll) {
      process.env.VERBOSE && console.log("enqueueing to token", tokenToHash.token, tokenToHash.os);
      const pushNotification: Components.Schemas.PushNotificationLightningInvoicePaid = {
        sat: body.amt_paid_sat,
        badge: 1,
        type: 1,
        level: "transactions",
        os: tokenToHash.os === "android" ? "android" : "ios", //hacky
        token: tokenToHash.token,
        hash: hashShouldBe,
        memo: body.memo,
      };

      await this.sendQueueRepository.save({
        data: JSON.stringify(pushNotification),
      });
    }

    response.status(200).send("");
  }

  async ping(request: Request, response: Response, next: NextFunction) {
    const keyValueRepository = getRepository(KeyValue);
    const sendQueueRepository = getRepository(SendQueue);
    const keyVal = await keyValueRepository.findOne({ key: LAST_PROCESSED_BLOCK });
    const send_queue_size = await sendQueueRepository.count();

    const serverInfo: Paths.Ping.Get.Responses.$200 = {
      name: pck.name,
      description: pck.description,
      version: pck.version,
      uptime: Math.floor(process.uptime()),
      last_processed_block: +keyVal.value,
      send_queue_size,
    };

    return serverInfo;
  }

  async setTokenConfiguration(request: Request, response: Response, next: NextFunction) {
    const body: Paths.SetTokenConfiguration.Post.RequestBody = request.body;
    let tokenConfig = await this.tokenConfigurationRepository.findOne({ token: body.token, os: body.os });
    if (!tokenConfig) {
      tokenConfig = new TokenConfiguration();
      tokenConfig.token = body.token;
      tokenConfig.os = body.os;
    } else {
      if (typeof body.level_all !== "undefined") tokenConfig.level_all = !!body.level_all;
      if (typeof body.level_transactions !== "undefined") tokenConfig.level_transactions = !!body.level_transactions;
      if (typeof body.level_price !== "undefined") tokenConfig.level_price = !!body.level_price;
      if (typeof body.level_news !== "undefined") tokenConfig.level_news = !!body.level_news;
      if (typeof body.level_tips !== "undefined") tokenConfig.level_tips = !!body.level_tips;
      if (typeof body.lang !== "undefined") tokenConfig.lang = String(body.lang);
      if (typeof body.app_version !== "undefined") tokenConfig.app_version = String(body.app_version);
      tokenConfig.last_online = new Date();
    }

    try {
      await this.tokenConfigurationRepository.save(tokenConfig);
    } catch (error) {
      console.warn(error.message);
    }
    response.status(200).send("");
  }

  async enqueue(request: Request, response: Response, next: NextFunction) {
    const body: Paths.Enqueue.Post.RequestBody = request.body;

    process.env.VERBOSE && console.log("enqueueing", body);
    await this.sendQueueRepository.save({
      data: JSON.stringify(body),
    });
    response.status(200).send("");
  }

  async getTokenConfiguration(request: Request, response: Response, next: NextFunction) {
    const body: Paths.GetTokenConfiguration.Post.RequestBody = request.body;
    let tokenConfig = await this.tokenConfigurationRepository.findOne({ token: body.token, os: body.os });
    if (!tokenConfig) {
      tokenConfig = new TokenConfiguration();
      tokenConfig.token = body.token;
      tokenConfig.os = body.os;
      await this.tokenConfigurationRepository.save(tokenConfig);
    }

    const config: Paths.GetTokenConfiguration.Post.Responses.$200 = {
      level_all: tokenConfig.level_all,
      level_news: tokenConfig.level_news,
      level_price: tokenConfig.level_price,
      level_transactions: tokenConfig.level_transactions,
      level_tips: tokenConfig.level_tips,
      lang: tokenConfig.lang,
      app_version: tokenConfig.app_version,
    };

    return config;
  }
}
