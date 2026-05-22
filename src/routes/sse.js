import Router from "koa-router";
import { bus } from "../services/broadcast.js";

const router = new Router();

/**
 * GET /api/sse
 * Server-Sent Events 端点。长连接，接收服务端推送的语音通知。
 * 事件格式: data: {"type":"audio","url":"/audio/tts-xxx.mp3","text":"..."}
 */
router.get("/api/sse", (ctx) => {
  ctx.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  ctx.status = 200;
  ctx.respond = false;

  // 初始握手
  ctx.res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`, "utf-8");

  const onPush = (msg) => {
    ctx.res.write(`data: ${JSON.stringify(msg)}\n\n`, "utf-8");
  };

  bus.on("push", onPush);

  // 心跳，防止代理断开
  const heartbeat = setInterval(() => {
    ctx.res.write(":\n\n", "utf-8");
  }, 15000);

  // 客户端断开时清理
  ctx.req.on("close", () => {
    bus.off("push", onPush);
    clearInterval(heartbeat);
  });
});

export default router;
