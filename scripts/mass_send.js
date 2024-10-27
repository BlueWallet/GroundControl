const fs = require("fs");

const text = fs.readFileSync("all_tokens_unique.csv", { encoding: "utf8" });

const lines = text.split("\n");
console.log("# got", lines.length, "tokens");

console.log("INSERT INTO send_queue_2 VALUES ");

let fisrt = true;
for (const line of lines.slice(0, 1000000)) {
  const [token, os] = line.split("\t");
  const sql =
    (fisrt ? "" : ", ") + `(null, '{"type":5,"token":"${token}","os":"${os}","text":"If you are using Lightning, please read our blog post. The service is sunsetting. Balances should be moved to another service"}', null)`;
  console.log(sql);
  fisrt = false;
}

console.log(";");
