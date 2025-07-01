import "reflect-metadata";
import { Repository } from "typeorm";
import { TokenToAddress } from "./entity/TokenToAddress";
import { SendQueue } from "./entity/SendQueue";
import dataSource from "./data-source";
import { components } from "./openapi/api";
require("dotenv").config();
const url = require("url");
let jayson = require("jayson/promise");
let rpc = url.parse(process.env.BITCOIN_RPC);
let client = jayson.client.http(rpc);

let processedTxids = {};
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

let sendQueueRepository: Repository<SendQueue>;

async function processMempool() {
  process.env.VERBOSE && console.log("cached txids=", Object.keys(processedTxids).length);
  const responseGetrawmempool = await client.request("getrawmempool", []);
  process.env.VERBOSE && console.log(responseGetrawmempool.result.length, "txs in mempool");

  let addresses: string[] = [];
  let allPotentialPushPayloadsArray: components["schemas"]["PushNotificationOnchainAddressGotUnconfirmedTransaction"][] = [];

  let rpcBatch = [];
  const batchSize = 100;
  let countTxidsProcessed = 0;
  for (const txid of responseGetrawmempool.result) {
    countTxidsProcessed++;
    if (!txid) continue;
    if (!processedTxids[txid]) rpcBatch.push(client.request("getrawtransaction", [txid, true], undefined, false));
    if (rpcBatch.length >= batchSize || countTxidsProcessed === responseGetrawmempool.result.length) {
      const startBatch = +new Date();
      // got enough txids lets batch fetch them from bitcoind rpc
      const responses = await client.request(rpcBatch);
      for (const response of responses) {
        if (response.result && response.result.vout) {
          for (const output of response.result.vout) {
            if (output.scriptPubKey && (output.scriptPubKey.addresses || output.scriptPubKey.address)) {
              for (const address of output.scriptPubKey?.addresses ?? (output.scriptPubKey?.address ? [output.scriptPubKey?.address] : [])) {
                addresses.push(address);
                processedTxids[response.result.txid] = true;
                const payload: components["schemas"]["PushNotificationOnchainAddressGotUnconfirmedTransaction"] = {
                  address,
                  txid: response.result.txid,
                  sat: Math.floor(output.value * 100000000),
                  type: 3,
                  level: "transactions",
                  token: "",
                  os: "ios",
                };
                allPotentialPushPayloadsArray.push(payload);
              }
            }
          }
        }
      }

      if (addresses.length === 0) {
        allPotentialPushPayloadsArray = [];
        addresses = [];
        rpcBatch = [];
        continue;
      }

      // fetching found addresses from db:
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
            payload.type = 3;
            payload.level = "transactions";
            payload.badge = 1;
            await sendQueueRepository.save({
              data: JSON.stringify(payload),
            });
          }
        }
      }

      allPotentialPushPayloadsArray = [];
      addresses = [];
      rpcBatch = [];

      const endBatch = +new Date();
      // process.stdout.write('.');
      process.env.VERBOSE && console.log("batch took", (endBatch - startBatch) / 1000, "sec");
    }
  }
}

dataSource
  .initialize()
  .then(async (connection) => {
    // start worker
    console.log("running groundcontrol worker-processmempool");
    console.log(require("fs").readFileSync("./bowie.txt").toString("ascii"));

    sendQueueRepository = dataSource.getRepository(SendQueue);

    while (1) {
      const start = +new Date();
      try {
        await processMempool();
      } catch (error) {
        console.warn("Exception in processMempool():", error);
      }
      const end = +new Date();
      console.log("processing mempool took", (end - start) / 1000, "sec");
      console.log("-----------------------");
      await new Promise((resolve) => setTimeout(resolve, 9000, false));
    }
  })
  .catch((error) => {
    console.error("exception in mempool processor:", error, "comitting suicide");
    process.exit(1);
  });
