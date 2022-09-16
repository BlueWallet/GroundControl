import { DataSource } from "typeorm";
require("dotenv").config();

if (!process.env.JAWSDB_MARIA_URL) {
  console.error("not all env variables set");
  process.exit();
}

const url = require("url");
const parsed = url.parse(process.env.JAWSDB_MARIA_URL);

export default new DataSource({
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
});
