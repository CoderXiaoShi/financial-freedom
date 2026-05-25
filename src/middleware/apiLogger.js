import logger from "../services/logger.js";

/**
 * API 入参/出参 日志中间件。
 * 记录每个请求的 method、url、入参（query/body）和出参（响应体）。
 */
export default async function apiLogger(ctx, next) {
  const start = Date.now();
  const { method, url } = ctx;

  // 入参
  const input = {
    query: ctx.query,
    body: ctx.request.body,
  };
  // 去掉空对象
  if (!Object.keys(input.query).length) delete input.query;
  if (!input.body || (typeof input.body === "object" && !Object.keys(input.body).length)) delete input.body;

  logger.info(`--> ${method} ${url}`, input);

  await next();

  const ms = Date.now() - start;
  const output = ctx.body;

  // 跳过 SSE 长连接（body 为 undefined 或流式响应）
  if (output === undefined || output === null) {
    logger.info(`<-- ${method} ${url} ${ctx.status} ${ms}ms`, { type: "stream" });
    return;
  }

  // 响应体摘要：字符串截断，对象转为简要信息
  const summary = typeof output === "string"
    ? output.slice(0, 200) + (output.length > 200 ? `...(${output.length} chars)` : "")
    : summarize(output);

  logger.info(`<-- ${method} ${url} ${ctx.status} ${ms}ms`, { body: summary });
}

function summarize(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const keys = Object.keys(obj);
  return { type: "object", keys, sample: JSON.stringify(obj).slice(0, 300) };
}
