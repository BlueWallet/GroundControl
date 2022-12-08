import { GroundControlToMajorTom } from "../src/class/GroundControlToMajorTom";

const http2 = require("http2");

if (!process.env.APNS_P8 || !process.env.APPLE_TEAM_ID || !process.env.APNS_P8_KID) {
  console.error("not all env variables set");
  process.exit();
}

console.log("APNS_P8_KID =", process.env.APNS_P8_KID);
console.log("APPLE_TEAM_ID =", process.env.APPLE_TEAM_ID);
console.log("APNS_TOPIC =", process.env.APNS_TOPIC);

async function _pushToApns(apnsP8: string, token: string, apnsPayload: object, collapseId) {
  const client = http2.connect("https://api.push.apple.com");
  client.on("error", (err) => console.error(err));
  const headers = {
    ":method": "POST",
    "apns-topic": process.env.APNS_TOPIC,
    "apns-collapse-id": collapseId,
    "apns-expiration": Math.floor(+new Date() / 1000 + 3600 * 24),
    ":scheme": "https",
    ":path": "/3/device/" + token,
    authorization: `bearer ${apnsP8}`,
  };
  const request = client.request(headers);

  let responseJson = {};
  request.on("response", (headers, flags) => {
    for (const name in headers) {
      responseJson[name] = headers[name];
    }
  });
  request.on("error", (err) => {
    console.error("Apple push error:", err);

    const responseJson = {};
    responseJson["error"] = err;
    client.close();
  });

  request.setEncoding("utf8");

  let data = "";
  request.on("data", (chunk) => {
    data += chunk;
  });
  request.write(JSON.stringify(apnsPayload));
  request.on("end", () => {
    if (Object.keys(responseJson).length === 0) {
      return;
    }
    responseJson["data"] = data;
    client.close();

    console.log(responseJson);
  });
  request.end();
}

const apnsPayload = {
  aps: {
    badge: 0,
    alert: {
      title: "hello",
      body: "world!",
    },
    sound: "default",
  },
  data: {},
};

_pushToApns(GroundControlToMajorTom.getApnsJwtToken(), "3a20c2c2c301c8b103ca002107e1e60cb35dd7fc0d3046c0ae2139e6889e16dc", apnsPayload, "collapseId");
