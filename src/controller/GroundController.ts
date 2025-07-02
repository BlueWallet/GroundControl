import { DataSource } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { TokenToAddress } from "../entity/TokenToAddress";
import { TokenToHash } from "../entity/TokenToHash";
import { TokenToTxid } from "../entity/TokenToTxid";
import { TokenConfiguration } from "../entity/TokenConfiguration";
import { SendQueue } from "../entity/SendQueue";
import { PushLog } from "../entity/PushLog";
import { KeyValue } from "../entity/KeyValue";
import dataSource from "../data-source";
import { paths, components } from "../openapi/api";
import { ADDRESS_IGNORE_LIST } from "../address-ignore-list";
require("dotenv").config();
const pck = require("../../package.json");
if (!process.env.JAWSDB_MARIA_URL || !process.env.GOOGLE_KEY_FILE || !process.env.APNS_P8 || !process.env.APNS_TOPIC || !process.env.APPLE_TEAM_ID || !process.env.APNS_P8_KID || !process.env.GOOGLE_PROJECT_ID) {
  console.error("not all env variables set");
  process.exit();
}

const LAST_PROCESSED_BLOCK = "LAST_PROCESSED_BLOCK";

export class GroundController {
  private _tokenToAddressRepository;
  private _tokenToHashRepository;
  private _tokenToTxidRepository;
  private _tokenConfigurationRepository;
  private _sendQueueRepository;
  private _connection: DataSource;

  constructor(connection: DataSource) {
    this._connection = connection;
  }

  get tokenToAddressRepository() {
    if (this._tokenToAddressRepository) {
      return this._tokenToAddressRepository;
    }

    this._tokenToAddressRepository = this._connection.getRepository(TokenToAddress);
    return this._tokenToAddressRepository;
  }

  get tokenToHashRepository() {
    if (this._tokenToHashRepository) {
      return this._tokenToHashRepository;
    }
    this._tokenToHashRepository = this._connection.getRepository(TokenToHash);
    return this._tokenToHashRepository;
  }

  get tokenToTxidRepository() {
    if (this._tokenToTxidRepository) {
      return this._tokenToTxidRepository;
    }

    this._tokenToTxidRepository = this._connection.getRepository(TokenToTxid);
    return this._tokenToTxidRepository;
  }

  get tokenConfigurationRepository() {
    if (this._tokenConfigurationRepository) {
      return this._tokenConfigurationRepository;
    }

    this._tokenConfigurationRepository = this._connection.getRepository(TokenConfiguration);
    return this._tokenConfigurationRepository;
  }

  get sendQueueRepository() {
    if (this._sendQueueRepository) {
      return this._sendQueueRepository;
    }

    this._sendQueueRepository = this._connection.getRepository(SendQueue);
    return this._sendQueueRepository;
  }

  /**
   * Submit bitcoin addressess that you wish to be notified about to specific push token. Token serves as unique identifier of a device/user. Also, OS of the token
   *
   * @param request
   * @param response
   * @param next
   */
  async majorTomToGroundControl(request: Request, response: Response, next: NextFunction) {
    const body: paths["/majorTomToGroundControl"]["post"]["requestBody"]["content"]["application/json"] = request.body;

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
    const body: paths["/unsubscribe"]["post"]["requestBody"]["content"]["application/json"] = request.body;
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
        const addressRecord = await this.tokenToAddressRepository.findOneBy({ os: body.os, token: body.token, address });
        await this.tokenToAddressRepository.remove(addressRecord);
      } catch (_) {}
    }

    for (const hash of body.hashes) {
      try {
        const hashRecord = await this.tokenToHashRepository.findOneBy({ os: body.os, token: body.token, hash });
        await this.tokenToHashRepository.remove(hashRecord);
      } catch (_) {}
    }

    for (const txid of body.txids) {
      try {
        const txidRecord = await this.tokenToTxidRepository.findOneBy({ os: body.os, token: body.token, txid });
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
    const body: paths["/lightningInvoiceGotSettled"]["post"]["requestBody"]["content"]["application/json"] = request.body;

    const hashShouldBe = require("crypto").createHash("sha256").update(Buffer.from(body.preimage, "hex")).digest("hex");
    if (hashShouldBe !== body.hash) {
      response.status(500).send("preimage doesnt match hash");
      return;
    }

    const tokenToHashAll = await this.tokenToHashRepository.find({
      where: {
        hash: hashShouldBe,
      },
    });
    for (const tokenToHash of tokenToHashAll) {
      process.env.VERBOSE && console.log("enqueueing to token", tokenToHash.token, tokenToHash.os);
      const pushNotification: components["schemas"]["PushNotificationLightningInvoicePaid"] = {
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
    const keyValueRepository = this._connection.getRepository(KeyValue);
    const sendQueueRepository = this._connection.getRepository(SendQueue);
    const keyVal = await keyValueRepository.findOneBy({ key: LAST_PROCESSED_BLOCK });
    const send_queue_size = await sendQueueRepository.count();

    const ts = new Date(+new Date() - 1000 * 3600 * 24).toISOString();
    const sent_24h = await this._connection.createQueryBuilder(PushLog, "PushLog").where("PushLog.created >= :ts", { ts }).getCount();

    const serverInfo: paths["/ping"]["get"]["responses"]["200"]["content"]["application/json"] = {
      name: pck.name,
      description: pck.description,
      version: pck.version,
      uptime: Math.floor(process.uptime()),
      last_processed_block: +keyVal.value,
      send_queue_size,
      sent_24h,
    };

    return serverInfo;
  }

  async setTokenConfiguration(request: Request, response: Response, next: NextFunction) {
    const body: paths["/setTokenConfiguration"]["post"]["requestBody"]["content"]["application/json"] = request.body;
    let tokenConfig = await this.tokenConfigurationRepository.findOneBy({ token: body.token, os: body.os });
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
    const body: paths["/enqueue"]["post"]["requestBody"]["content"]["application/json"] = request.body;

    process.env.VERBOSE && console.log("enqueueing", body);
    await this.sendQueueRepository.save({
      data: JSON.stringify(body),
    });
    response.status(200).send("");
  }

  async getTokenConfiguration(request: Request, response: Response, next: NextFunction) {
    const body: paths["/getTokenConfiguration"]["post"]["requestBody"]["content"]["application/json"] = request.body;
    let tokenConfig = await this.tokenConfigurationRepository.findOneBy({ token: body.token, os: body.os });
    if (!tokenConfig) {
      tokenConfig = new TokenConfiguration();
      tokenConfig.token = body.token;
      tokenConfig.os = body.os;
      await this.tokenConfigurationRepository.save(tokenConfig);
    }

    const config: paths["/getTokenConfiguration"]["post"]["responses"]["200"]["content"]["application/json"] = {
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
