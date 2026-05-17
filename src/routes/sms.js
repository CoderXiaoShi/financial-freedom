import Router from "koa-router";
import { expenseGraph } from "../graphs/expense/graph.js";

const router = new Router();
router.prefix("/api");

/**
 * POST /api/sms
 * 接收短信 webhook，解析后记账。
 * Body: { sender, body, receivedAt }
 */
router.post("/sms", async (ctx) => {
  const { body, sender } = ctx.request.body;

  if (!body) {
    ctx.status = 400;
    ctx.body = { success: false, error: "缺少短信内容 body" };
    return;
  }

  const result = await expenseGraph.invoke({
    rawInput: body,
  });

  if (result.error) {
    ctx.status = 500;
    ctx.body = { success: false, error: result.error };
    return;
  }

  ctx.body = {
    success: true,
    transaction: result.transaction,
    balance: {
      totalSpent: result.totalSpent,
      remaining: result.remaining,
      dailyBudget: result.dailyBudget,
    },
    riskLevel: result.riskLevel,
    advice: result.advice || undefined,
  };
});

export default router;
