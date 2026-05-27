import Router from "koa-router";
import { expenseGraph } from "../graphs/expense/graph.js";
import { defaultModel } from "../llm/client.js";
import { queryTransactions } from "../tools/ledger.js";
import { calculateBalance } from "../tools/calculator.js";
import { readJSON, writeJSON } from "../store.js";
import { sendMessage } from "../services/feishu.js";
import logger from "../services/logger.js";

const router = new Router();
const VERIFY_TOKEN = process.env.FEISHU_VERIFY_TOKEN || "";

// 调试：记录最近收到的请求
const recentRequests = [];
function pushRecent(req) {
  recentRequests.unshift(req);
  if (recentRequests.length > 50) recentRequests.pop();
}

/** GET /api/feishu/event — 调试：查看最近请求记录 */
router.get("/api/feishu/event", (ctx) => {
  ctx.body = {
    now: new Date().toISOString(),
    recentRequests: recentRequests.slice(0, 20),
    hasVerifyToken: !!VERIFY_TOKEN,
  };
});

/** POST /api/feishu/event */
router.post("/api/feishu/event", async (ctx) => {
  try {
    await handleEvent(ctx);
  } catch (err) {
    logger.error("飞书 webhook 异常:", err.message);
    ctx.status = 200;
    ctx.body = {};
  }
});

async function handleEvent(ctx) {
  const body = ctx.request.body;

  pushRecent({
    time: new Date().toISOString(),
    type: body?.type || "unknown",
    eventType: body?.header?.event_type || "",
    hasBody: !!body,
    hasChallenge: !!body?.challenge,
  });

  // body 解析失败
  if (!body) {
    logger.warn("飞书回调 body 为空");
    ctx.status = 200;
    ctx.body = {};
    return;
  }

  // 1. URL 验证（飞书配置事件订阅时的 challenge）
  if (body.type === "url_verification") {
    ctx.body = { challenge: body.challenge };
    logger.info(`飞书 URL 验证通过, challenge=${body.challenge}`);
    return;
  }

  // 2. 校验来源 token（仅当配置了 VERIFY_TOKEN 时）
  const headerToken = ctx.get("X-Lark-Request-Token") || "";
  if (VERIFY_TOKEN && headerToken && headerToken !== VERIFY_TOKEN) {
    logger.warn(`飞书 token 校验失败: got=${headerToken}`);
    ctx.status = 200;
    ctx.body = {};
    return;
  }

  // 3. 快速响应 200（飞书要求 3 秒内响应，否则会重试）
  ctx.status = 200;
  ctx.body = {};

  // 4. 只处理接收消息事件
  const eventType = body.header?.event_type;
  if (eventType !== "im.message.receive_v1") return;

  const event = body.event;
  const msg = event?.message;
  if (!msg || msg.message_type !== "text") return;

  // 5. 跳过机器人自己的消息
  const chatType = msg.chat_type;
  if (chatType === "bot") return;

  const chatId = msg.chat_id;
  const senderInfo = event.sender?.sender_id || {};
  if (!chatId) return;

  let userText = "";
  try {
    const content = JSON.parse(msg.content);
    userText = content.text || "";
  } catch {
    return;
  }
  if (!userText.trim()) return;

  logger.info(`飞书消息: chat_id=${chatId} sender=${JSON.stringify(senderInfo)} 内容=${userText.slice(0, 100)}`);

  // 保存 chat_id 用于后续主动提醒
  const settings = readJSON("settings.json") || {};
  if (settings.feishuChatId !== chatId) {
    settings.feishuChatId = chatId;
    writeJSON("settings.json", settings);
  }

  // 6. 意图分类 → 路由处理 → 回复
  try {
    const intent = await classifyIntent(userText);
    const reply = await handleIntent(intent, userText);
    await sendMessage(chatId, reply, "chat_id");
    logger.info(`飞书回复: ${reply.slice(0, 100)}`);
  } catch (err) {
    logger.error(`飞书处理失败: ${err.message}`);
    await sendMessage(chatId, `至尊宝走神了：${err.message}`, "chat_id").catch(() => {});
  }
}

/**
 * LLM 意图分类。返回 record | query | advice | chat。
 */
async function classifyIntent(text) {
  const prompt = `判断用户意图，只回复一个词：
- 用户要记账、记录消费 → record
- 用户要查账单、余额、花了多少、还剩多少 → query
- 用户要消费建议、省钱建议、理财建议 → advice
- 其他（打招呼、闲聊、感谢）→ chat

用户说："${text}"`;

  const res = await defaultModel.invoke(prompt);
  return (res.content || "").trim().toLowerCase();
}

/**
 * 根据意图分发处理。
 */
async function handleIntent(intent, text) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  switch (true) {
    case intent.includes("record"): {
      const result = await expenseGraph.invoke({ rawInput: text });
      if (result.error) return `记账失败：${result.error}`;
      const t = result.transaction;
      return [
        `已记录：${t.merchant || "未知商户"} ${t.category} ¥${t.amount}`,
        `本月已花 ¥${result.totalSpent} / ¥${result.monthlyBudget}，剩余 ¥${result.remaining}`,
        result.advice ? `\n至尊宝提醒：${result.advice}` : "",
      ].join("\n");
    }

    case intent.includes("query"): {
      const settings = { monthlyBudget: 3000, ...(readJSON("settings.json") || {}) };
      const budget = settings.monthlyBudget;
      const [txsJson, balJson] = await Promise.all([
        queryTransactions.invoke({ year, month }),
        calculateBalance.invoke({ year, month, budget }),
      ]);
      const txs = JSON.parse(txsJson);
      const bal = JSON.parse(balJson);

      const sampleTxs = txs.slice(0, 10)
        .map((t) => `- ${t.time?.slice(0, 10) || "?"} ${t.merchant} ${t.category} ¥${t.amount}`)
        .join("\n");

      return [
        `${year}年${month}月账单：`,
        `已消费 ¥${bal.totalSpent} / 预算 ¥${bal.budget}，剩余 ¥${bal.remaining}`,
        `日均可用 ¥${bal.dailyBudget}，剩余 ${bal.remainingDays} 天`,
        txs.length > 0 ? `\n最近${Math.min(txs.length, 10)}笔：\n${sampleTxs}` : "\n本月暂无消费记录",
        txs.length > 10 ? `\n...共 ${txs.length} 笔` : "",
      ].join("\n");
    }

    case intent.includes("advice"): {
      const result = await expenseGraph.invoke({ rawInput: "__ADVICE_ONLY__" });
      if (result.error) return `查询失败：${result.error}`;
      return result.advice || "目前一切正常，继续保持~";
    }

    default: {
      // chat：LLM 自由回复
      const res = await defaultModel.invoke(
        `你是至尊宝，一个AI财务管家，说话带有《大话西游》至尊宝的风格。现在用户对你说："${text}"。请简短回复（50字以内），可以适当幽默。`
      );
      return (res.content || "嗯？").trim();
    }
  }
}

export default router;
