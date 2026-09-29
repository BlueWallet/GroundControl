import "reflect-metadata";
import { Repository } from "typeorm";
import { TokenToAddress } from "./entity/TokenToAddress";
import { SendQueue } from "./entity/SendQueue";
import { KeyValue } from "./entity/KeyValue";
import { TokenToTxid } from "./entity/TokenToTxid";
import dataSource from "./data-source";
import { components } from "./openapi/api";
import { scriptPubKeyAddresses } from "./script-pub-key";
require("dotenv").config();
const url = require("url");

if (!process.env.BITCOIN_RPC) {
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

let jayson = require("jayson/promise");
let rpc = url.parse(process.env.BITCOIN_RPC);
let client = jayson.client.http(rpc);

const LAST_PROCESSED_BLOCK = "LAST_PROCESSED_BLOCK";

async function processBlock(blockNum, sendQueueRepository: Repository<SendQueue>) {
  console.log("processing new block", +blockNum);
  const responseGetblockhash = await client.request("getblockhash", [blockNum]);
  const responseGetblock = await client.request("getblock", [responseGetblockhash.result, 2]);
  if (!Array.isArray(responseGetblock?.result?.tx)) {
    throw new Error(`getblock returned no transactions for block ${blockNum}`);
  }
  const addresses: string[] = [];
  const allPotentialPushPayloadsArray: components["schemas"]["PushNotificationOnchainAddressGotPaid"][] = [];
  const txids: string[] = [];
  for (const tx of responseGetblock.result.tx) {
    if (!tx?.txid) continue;
    txids.push(tx.txid);
    if (!Array.isArray(tx.vout)) continue;
    for (const output of tx.vout) {
      for (const address of scriptPubKeyAddresses(output?.scriptPubKey)) {
        addresses.push(address);
        const payload: components["schemas"]["PushNotificationOnchainAddressGotPaid"] = {
          address,
          txid: tx.txid,
          sat: Math.floor(output.value * 100000000),
          type: 2,
          level: "transactions",
          token: "",
          os: "ios",
        };
        allPotentialPushPayloadsArray.push(payload);
      }
    }
  }

  if (txids.length === 0) {
    // a real block always has a coinbase. advancing here would drop every notification in it.
    throw new Error(`getblock returned no transactions for block ${blockNum}`);
  }

  console.log(addresses.length, "addresses paid in block");
  // allPotentialPushPayloadsArray.push({ address: "bc1qaemfnglf928kd9ma2jzdypk333au6ctu7h7led", txid: "666", sat: 1488, type: 2, token: "", os: "ios" }); // debug fixme
  // addresses.push("bc1qaemfnglf928kd9ma2jzdypk333au6ctu7h7led"); // debug fixme

  let entities2save = [];
  if (addresses.length > 0) {
    const query = dataSource.getRepository(TokenToAddress).createQueryBuilder().where("address IN (:...address)", { address: addresses });

    for (const t2a of await query.getMany()) {
      // found all addresses that we are tracking on behalf of our users. now,
      // iterating all addresses in a block to see if there is a match.
      // we could only iterate tracked addresses, but that would imply deduplication which is not good (for example,
      // in a single block user could get several incoming payments to different owned addresses)
      // cycle in cycle is less than optimal, but we can live with that for now
      for (let payload of allPotentialPushPayloadsArray) {
        if (t2a.address === payload.address) {
          process.env.VERBOSE && console.log("enqueueing", payload);
          payload.os = t2a.os === "android" ? "android" : "ios"; // hacky
          payload.token = t2a.token;
          payload.type = 2;
          payload.badge = 1;
          entities2save.push({
            data: JSON.stringify(payload),
          });
        }
      }
    }

    // batch insert via a raw query as its faster
    if (entities2save.length > 0) {
      await sendQueueRepository.createQueryBuilder().insert().into(SendQueue).values(entities2save).execute();
    }
  }

  // now, checking if there is a subscription to one of the mined txids:
  entities2save = [];
  const query2 = dataSource.getRepository(TokenToTxid).createQueryBuilder().where("txid IN (:...txids)", { txids });
  for (const t2txid of await query2.getMany()) {
    const payload: components["schemas"]["PushNotificationTxidGotConfirmed"] = {
      txid: t2txid.txid,
      type: 4,
      level: "transactions",
      token: t2txid.token,
      os: t2txid.os === "ios" ? "ios" : "android",
      badge: 1,
    };

    process.env.VERBOSE && console.log("enqueueing", payload);
    entities2save.push({
      data: JSON.stringify(payload),
    });
  }

  if (entities2save.length > 0) {
    await sendQueueRepository.createQueryBuilder().insert().into(SendQueue).values(entities2save).execute();
  }
}

dataSource
  .initialize()
  .then(async (connection) => {
    // start worker
    console.log("db connected");
    console.log("running groundcontrol worker-blockprocessor");
    console.log(require("fs").readFileSync("./bowie.txt").toString("ascii"));

    const KeyValueRepository = dataSource.getRepository(KeyValue);
    const sendQueueRepository = dataSource.getRepository(SendQueue);

    while (1) {
      const keyVal = await KeyValueRepository.findOneBy({ key: LAST_PROCESSED_BLOCK });
      if (!keyVal) {
        // if no info saved in database we assume we are all caught up and wait for the next block
        const responseGetblockcount = await client.request("getblockcount", []);
        await KeyValueRepository.save({ key: LAST_PROCESSED_BLOCK, value: responseGetblockcount.result });
        continue; // skipping worker iteration
      }

      const responseGetblockcount = await client.request("getblockcount", []);

      if (+responseGetblockcount.result <= +keyVal.value) {
        await new Promise((resolve) => setTimeout(resolve, 10_000, false));
        continue;
      }

      let nextBlockToProcess: number = +keyVal.value + 1; // or +responseGetblockcount.result to aways process last block and skip intermediate blocks
      const start = +new Date();
      try {
        await processBlock(nextBlockToProcess, sendQueueRepository);
      } catch (error) {
        // dont advance LAST_PROCESSED_BLOCK: advancing would silently drop every notification
        // in this block. transient errors (bitcoind hiccup, db down) resolve on retry
        console.warn("exception when processing block:", error, "retrying block", nextBlockToProcess);
        await new Promise((resolve) => setTimeout(resolve, 10_000, false));
        continue;
      }
      const end = +new Date();
      console.log("took", (end - start) / 1000, "sec");
      keyVal.value = String(nextBlockToProcess);
      await KeyValueRepository.save(keyVal);
    }
  })
  .catch((error) => {
    console.error("exception in blockprocessor:", error, "comitting suicide");
    process.exit(1);
  });
