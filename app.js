import Koa from "koa";
import json from "koa-json";
import onerror from "koa-onerror";
import bodyparser from "koa-bodyparser";
import logger from "koa-logger";
import koaStatic from "koa-static";
import views from "koa-views";
import { fileURLToPath } from "node:url";
import path from "node:path";

import apiLogger from "./src/middleware/apiLogger.js";
import billsRouter from "./src/routes/bills.js";
import smsRouter from "./src/routes/sms.js";
import speakRouter from "./src/routes/speak.js";
import swaggerRouter from "./src/routes/swagger.js";
import sseRouter from "./src/routes/sse.js";
import feishuRouter from "./src/routes/feishu.js";
import pageRouter from "./src/routes/page.js";

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
  extension: "ejs",
}));

app.use(apiLogger);

app.use(billsRouter.routes(), billsRouter.allowedMethods());
app.use(smsRouter.routes(), smsRouter.allowedMethods());
app.use(speakRouter.routes(), speakRouter.allowedMethods());
app.use(swaggerRouter.routes(), swaggerRouter.allowedMethods());
app.use(sseRouter.routes(), sseRouter.allowedMethods());
app.use(feishuRouter.routes(), feishuRouter.allowedMethods());
app.use(pageRouter.routes(), pageRouter.allowedMethods());

app.on("error", (err, ctx) => {
  console.error("server error", err, ctx);
});

export default app;
