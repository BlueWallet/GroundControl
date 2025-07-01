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
require("dotenv").config();
const pck = require("../../package.json");
if (!process.env.JAWSDB_MARIA_URL || !process.env.GOOGLE_KEY_FILE || !process.env.APNS_P8 || !process.env.APNS_TOPIC || !process.env.APPLE_TEAM_ID || !process.env.APNS_P8_KID || !process.env.GOOGLE_PROJECT_ID) {
  console.error("not all env variables set");
  process.exit();
}

const LAST_PROCESSED_BLOCK = "LAST_PROCESSED_BLOCK";

const ADDRESS_IGNORE_LIST = [
  "1NXNHZr6Pbzi3VStcgaxwEhspTWNXQ3Q4G",
  "bc1qee7hk4a3k3km7j8hwclm0pkl76dhhgxay5nevu",
  "bc1qclyfsxuu8vcwq38yygs5zrskwacq8sjlyvk9mx",
  "bc1qltxjty7xfrnkzlrhmxpcekknr3uncne8sht7rn",
  "bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej",
  "bc1qw8wrek2m7nlqldll66ajnwr9mh64syvkt67zlu",
  "1111111111111111111114oLvT2",
  "1BrasiLb2KMbdtuhb1chAVnS2FvcNGfV9J",
  "1GQdrgqAbkeEPUef1UpiTc4X1mUHMcyuGW",
  "1KHwtS5mn7NMUm7Ls7Y1XwxLqMriLdaGbX",
  "bc1q7cyrfmck2ffu2ud3rn5l5a8yv6f0chkp0zpemf",
  "bc1qwfgdjyy95aay2686fn74h6a4nu9eev6np7q4fn204dkj3274frlqrskvx0",
  "bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h",
  "bc1qrnn4wfhgz2e0etek66sh3n9l6k99alxk044mhr",
  "13nCMaHDNRGM29UfMMkhUQjHkVYY1ZyrpU",
  "bc1qel7tps3wu6zqztaanczvt76hffwh7k06jd8r9xh2v3ztpa5ty5dsz358ys",
  "bc1qyzxdu4px4jy8gwhcj82zpv7qzhvc0fvumgnh0r",
  "bc1qyemk24czaa6a2nr89nrz775ewvptxg7yfe750u",
  "bc1qq904ynep5mvwpjxdlyecgeupg22dm8am6cfvgq",
  "37biYvTEcBVMoR1NGkPTGvHUuLTrzcLpiv",
  "bc1qq9tk3uhcx58y5qvmzs50nhs49m0pdkmrfpkzs4",
  "1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g",
  "3DGxAYYUA61WrrdbBac8Ra9eA9peAQwTJF",
  "bc1qmgj3w0aw5455y9s4zfhts2kxm4qstwyjx5f907",
  "bc1qgrxsrmrhsapvh9addyx6sh8j4rw0sn9xtur9uq",
  "bc1qp3f7vnmuj4pjxpfvkvf7yznac9h9r5arlv4fpv",
  "bc1qnsupj8eqya02nm8v6tmk93zslu2e2z8chlmcej",
  "bc1qt5m8xeclsja4lkfvl2nvmrt6z9vg60sd8w2kc6",
  "bc1qsatlphjcgvzlt9xhsgn0dnjus5jgwg83dr05c6",
  "bc1quq29mutxkgxmjfdr7ayj3zd9ad0ld5mrhh89l2",
  "bc1qe9nagya0tvfhvymt8sejwedlukwq4a094h6ht9",
  "1GrwDkr33gT6LuumniYjKEGjTLhsL5kmqC",
  "33WSGLeVoEpuZDjB54HKZ1y5YsERELoVNq",
  "3A8n8rwMnHnt2BqnjW4R73eZCMcUDTpYvv",
  "bc1qns9f7yfx3ry9lj6yz7c9er0vwa0ye2eklpzqfw",
  "38XnPvu9PmonFU9WouPXUjYbW91wa5MerL",
  "1Bo8hs81QwnR6A3oFBXcWNZXgtwpfgByb3",
  "37Z6neB2wDC3hsPDHLy2n2kFahNNU3eos8",
  "1CK6KHY6MHgYvmRQ4PAafKYDrg1ejbH1cE",
  "36XWTfSYJJz3WSNPZVZ3q3aa5eFuJHR9nu",
  "bc1qc8ee9860cdnkyej0ag5hf49pcx7uvz89lkwpr9",
  "bc1q7ug4w4as2sefar89q057hnmxkakp58a25535ttlmurn6cncs8tms4e7gp2",
  "3JodN7GmkHdPgKj9G7HCkn9NDLhrcWCjVN",
  "bc1qujepl0k5n0ga2e86yskvxa6auehpf6dlf84dx0",
  "bc1qg9lgqyukp2rup5x4frrz7hhw7988k5q26luakm",
  "3JSdUu1ivm3rqMvuCTAdAj6Dc2hdVhHiEe",
  "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "bc1qr35hws365juz5rtlsjtvmulu97957kqvr3zpw3",
  "bc1qzlcvh2k3xs2jyzvya7xmx8l2ylpt259txy7wnd",
  "bc1qprdf80adfz7aekh5nejjfrp3jksc8r929svpxk",
  "35iMHbUZeTssxBodiHwEEkb32jpBfVueEL",
  "3QiETomgUhPu573ZvhXbdofq7y5ocNS1ie",
  "3HcEUguUZ4vyyMAPWDPUDjLqz882jXwMfV",
  "3J7cUjBZxvGRCwFBz3q23zAsnhFfZrDSSU",
  "bc1qamgjuxaywqls56h7rg7afga3m6rgqwfkew688k",
  "1G47mSr3oANXMafVrR8UC4pzV7FEAzo3r9",
  "17StnGroPUsNXBq4AVJQ1fqGftoFZh3zva",
  "1FWQiwK27EnGXb6BiBMRLJvunJQZZPMcGd",
  "16r7U7GqbVPeKukgfd3mUN9LCkuoKbfpXM",
  "bc1q22hp7n28whk5h94z93vm05hfx2zxs8ca9gglk7",
  "bc1q0wu0tqp2u3rtunjl0h0rsl9pvf86acy6sep63st0lp7lgg67ykzqeq89pn",
  "bc1qryhgpmfv03qjhhp2dj8nw8g4ewg08jzmgy3cyx",
  "bc1quhruqrghgcca950rvhtrg7cpd7u8k6svpzgzmrjy8xyukacl5lkq0r8l2d",
  "bc1q0s6rca52mjumq8fjuz4j6ka5h9jhq57esyd40r",
  "bc1qjguxrqjx9qnpmklzymdr0y6mqxrth9d3swzdpr",
  "bc1qr4dl5wa7kl8yu792dceg9z5knl2gkn220lk7a9",
  "1Dy8gSw3Zbpatr4bGn7zR4phNX18XuTD56",
  "bc1qcdqj2smprre85c78d942wx5tauw5n7uw92r7wr",
  "bc1qmhq4sgtchfgh6ul75x3rsuegt55mef0zx3ehm2",
  "bc1qws8yeyfxzykuq7tevwwxezyv3ad99emlyy9uls",
  "bc1q42kvqt0e3f27qhd2ucnprarl5ywpuj7tu0h9v2",
  "bc1q5k9tyr30xhmvmnj2z2cx0psprz44ksnmpuw7q8",
  "bc1qfpeps3wcmzk422hvm5jeq5lelnqlzznjwyfy69",
  "bc1qfy4ck4xpu3vg2226ew9jssly6xvc8w5xhjkzxz",
  "bc1q9yn6zdkjjlh0z5y6sqpdvwq7pwkeh5r0ka28ad",
  "bc1qpsys7sfk5u7ue3lffwzszzvffhtku78kr0vva4",
  "bc1q0qfzuge7vr5s2xkczrjkccmxemlyyn8mhx298v",
  "bc1pz454nh8mdcq093zfcc4qe2hw5ejha98k3e6n9apqkhemqv9w5kuqh2xcst",
  "bc1qynygs8d3ju9cpum9pepmh94qk57tf67paka78g",
];

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
  
  // Query to find processes sleeping for more than 3600 seconds
  const query = `
    SELECT id, user, host, db, command, time, state, info
    FROM information_schema.processlist 
    WHERE command = 'Sleep' AND time > 3600 AND id != CONNECTION_ID()
  `;
  
  connection.query(query)
    .then((sleepingProcesses: any[]) => {
      if (sleepingProcesses.length > 0) {
        console.log(`Found ${sleepingProcesses.length} sleeping processes older than 1 hour`);
        
        // Kill each sleeping process
        const killPromises = sleepingProcesses.map((process) => {
          console.log(`Killing process ID ${process.id} (user: ${process.user}, host: ${process.host}, sleeping for ${process.time}s)`);
          return connection.query(`KILL ${process.id}`)
            .then(() => console.log(`Successfully killed process ${process.id}`))
            .catch((error) => console.log(`Error killing process ${process.id}:`, error.message));
        });
        
        return Promise.all(killPromises);
      } else {
        console.log("No sleeping processes found that are older than 1 hour");
      }
    })
    .catch((error) => {
      console.log("Error checking sleeping processes:", error.message);
    });
};

dataSource.initialize().then((c) => {
  console.log("db connected");
  connection = c;
  purgeIgnoredAddressesSubscriptions();
  pushLogPurge();
  purgeOldTxidSubscriptions();
  killSleepingMySQLProcesses();
  setInterval(pushLogPurge, 3600 * 1000);
  setInterval(killSleepingMySQLProcesses, 3600 * 1000); // Run every hour
});

export class GroundController {
  private _tokenToAddressRepository;
  private _tokenToHashRepository;
  private _tokenToTxidRepository;
  private _tokenConfigurationRepository;
  private _sendQueueRepository;

  get tokenToAddressRepository() {
    if (this._tokenToAddressRepository) {
      return this._tokenToAddressRepository;
    }

    this._tokenToAddressRepository = connection.getRepository(TokenToAddress);
    return this._tokenToAddressRepository;
  }

  get tokenToHashRepository() {
    if (this._tokenToHashRepository) {
      return this._tokenToHashRepository;
    }
    this._tokenToHashRepository = connection.getRepository(TokenToHash);
    return this._tokenToHashRepository;
  }

  get tokenToTxidRepository() {
    if (this._tokenToTxidRepository) {
      return this._tokenToTxidRepository;
    }

    this._tokenToTxidRepository = connection.getRepository(TokenToTxid);
    return this._tokenToTxidRepository;
  }

  get tokenConfigurationRepository() {
    if (this._tokenConfigurationRepository) {
      return this._tokenConfigurationRepository;
    }

    this._tokenConfigurationRepository = connection.getRepository(TokenConfiguration);
    return this._tokenConfigurationRepository;
  }

  get sendQueueRepository() {
    if (this._sendQueueRepository) {
      return this._sendQueueRepository;
    }

    this._sendQueueRepository = connection.getRepository(SendQueue);
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
    const keyValueRepository = connection.getRepository(KeyValue);
    const sendQueueRepository = connection.getRepository(SendQueue);
    const keyVal = await keyValueRepository.findOneBy({ key: LAST_PROCESSED_BLOCK });
    const send_queue_size = await sendQueueRepository.count();

    const ts = new Date(+new Date() - 1000 * 3600 * 24).toISOString();
    const sent_24h = await connection.createQueryBuilder(PushLog, "PushLog").where("PushLog.created >= :ts", { ts }).getCount();

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
