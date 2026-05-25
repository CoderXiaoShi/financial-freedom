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

  // 禁用 socket 超时，保持长连接
  ctx.req.socket.setTimeout(0);
  ctx.res.flushHeaders();

  // 初始握手
  write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  const onPush = (msg) => {
    write(`data: ${JSON.stringify(msg)}\n\n`);
  };

  bus.on("push", onPush);

  // 心跳，15s 用 data 消息（某些代理会忽略 SSE 注释）
  const heartbeat = setInterval(() => {
    write(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`);
  }, 15000);

  // 客户端断开时清理
  ctx.req.on("close", () => {
    bus.off("push", onPush);
    clearInterval(heartbeat);
  });

  ctx.req.on("error", () => {
    bus.off("push", onPush);
    clearInterval(heartbeat);
  });

  function write(data) {
    try {
      ctx.res.write(data, "utf-8");
    } catch {
      // 客户端已断开，忽略写入错误
    }
  }
});

export default router;
