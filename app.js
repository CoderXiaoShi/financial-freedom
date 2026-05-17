import Koa from "koa";
import json from "koa-json";
import onerror from "koa-onerror";
import bodyparser from "koa-bodyparser";
import logger from "koa-logger";
import koaStatic from "koa-static";
import views from "koa-views";
import { fileURLToPath } from "node:url";
import path from "node:path";

import billsRouter from "./src/routes/bills.js";
import smsRouter from "./src/routes/sms.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = new Koa();

onerror(app);

app.use(bodyparser({
  enableTypes: ["json", "form", "text"],
}));
app.use(json());
app.use(logger());
app.use(koaStatic(__dirname + "/public"));

app.use(views(__dirname + "/views", {
  extension: "pug",
}));

app.use(async (ctx, next) => {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

app.use(billsRouter.routes(), billsRouter.allowedMethods());
app.use(smsRouter.routes(), smsRouter.allowedMethods());

app.on("error", (err, ctx) => {
  console.error("server error", err, ctx);
});

export default app;
