import "../openapi/api";
import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { TokenToAddress } from "../entity/TokenToAddress";
import { TokenToHash } from "../entity/TokenToHash";
import { TokenToTxid } from "../entity/TokenToTxid";
import { GroundControlToMajorTom } from "../class/GroundControlToMajorTom";
require("dotenv").config();
const pck = require("../../package.json");
const serverKey = process.env.FCM_SERVER_KEY;
const apnsPem = process.env.APNS_PEM;
if (!process.env.JAWSDB_MARIA_URL || !process.env.FCM_SERVER_KEY || !process.env.APNS_PEM) {
  console.error("not all env variables set");
  process.exit();
}

export class GroundController {
  private tokenToAddressRepository = getRepository(TokenToAddress);
  private tokenToHashRepository = getRepository(TokenToHash);
  private tokenToTxidRepository = getRepository(TokenToTxid);

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
      console.warn("pushing to token", tokenToHash.token, tokenToHash.os);
      const pushNotification: Components.Schemas.PushNotificationLightningInvoicePaid = {
        sat: body.amt_paid_sat,
        badge: 1,
        type: 1,
        os: tokenToHash.os === "android" ? "android" : "ios", //hacky
        token: tokenToHash.token,
        hash: hashShouldBe,
        memo: body.memo,
      };

      await GroundControlToMajorTom.pushLightningInvoicePaid(serverKey, apnsPem, pushNotification);
    }

    response.status(200).send("");
  }

  async ping(request: Request, response: Response, next: NextFunction) {
    const serverInfo: Paths.Ping.Get.Responses.$200 = {
      description: pck.description,
      version: pck.version,
      uptime: Math.floor(process.uptime()),
    };

    return serverInfo;
  }
}
