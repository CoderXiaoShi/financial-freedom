import log4js from "log4js";

log4js.configure({
  appenders: {
    console: { type: "console" },
    file: {
      type: "dateFile",
      filename: "logs/app.log",
      pattern: "yyyy-MM-dd",
      keepFileExt: true,
      alwaysIncludePattern: true,
      numBackups: 30,
    },
  },
  categories: {
    default: { appenders: ["console", "file"], level: "info" },
    api: { appenders: ["console", "file"], level: "info" },
    llm: { appenders: ["console", "file"], level: "info" },
  },
});

const logger = log4js.getLogger("api");

export default logger;
