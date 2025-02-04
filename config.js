const { Sequelize } = require("sequelize");
require("dotenv").config();

const toBool = (x) => (x && x.toLowerCase() === "true") || false;
const DATABASE_URL = process.env.DATABASE_URL || "./database.db";

module.exports = {
  SESSION_ID: (process.env.SESSION_ID || "").trim(),
  BOT_INFO: process.env.BOT_NAME || "Ʀ ᴜ ᴅ ʜ ʀ λ;Ƥ ʀ ɪ ɴ ᴄ ᴇ  Ʀ ᴜ ᴅ ʜ;https://raw.githubusercontent.com/rudhraan/media/main/image/rudhra3.jpeg",
  SUDO: process.env.SUDO || "919895809960",
  HANDLERS:
    process.env.HANDLER === "false" ||
    process.env.HANDLER === "null" ||
    process.env.HANDLER === undefined
      ? "^"
      : process.env.HANDLER,
  WELCOME_MSG: process.env.WELCOME_MSG || "Hi @user, welcome to @gname!",
  GOODBYE_MSG: process.env.GOODBYE_MSG || "Hi @user, it was nice seeing you!",
  ANTILINK: toBool(process.env.ANTILINK) || true,
  AUTO_READ: toBool(process.env.AUTO_READ) || false,
  AUTO_STATUS_READ: toBool(process.env.AUTO_STATUS_READ) || false,
  STICKER_PACK: process.env.AUTHOR || "Ʀ ᴜ ᴅ ʜ ʀ λ;Ƥ ʀ ɪ ɴ ᴄ ᴇ  Ʀ ᴜ ᴅ ʜ",
  LOGS: toBool(process.env.LOGS) || true,
  WORK_TYPE: process.env.WORK_TYPE || "private",
  DATABASE_URL: DATABASE_URL,
  DATABASE:
    DATABASE_URL === "./database.db"
      ? new Sequelize({
          dialect: "sqlite",
          storage: DATABASE_URL,
          logging: false,
        })
      : new Sequelize(DATABASE_URL, {
          dialect: "postgres",
          ssl: true,
          protocol: "postgres",
          dialectOptions: {
            native: true,
            ssl: { require: true, rejectUnauthorized: false },
          },
          logging: false,
        }),
  BRANCH: "main",
  WARN_COUNT: 3,
  RMBG_API_KEY: process.env.RMBG_API_KEY || "",
  DELETED_LOG: toBool(process.env.DELETED_LOG) || false,
  DELETED_LOG_CHAT: toBool(process.env.DELETED_LOG_CHAT) || false,
  TIME_ZONE: process.env.TZ || "UTC",
  VERSION: require("./package.json").version,
};
