import Router from "koa-router";
import { readJSON } from "../store.js";

const router = new Router();
router.prefix("/api");

/**
 * GET /api/bills?year=2026&month=5
 * 查询指定月账单汇总。
 */
router.get("/bills", async (ctx) => {
  const now = new Date();
  const year = parseInt(ctx.query.year) || now.getFullYear();
  const month = parseInt(ctx.query.month) || now.getMonth() + 1;

  const data = readJSON("transactions.json") || { transactions: [] };
  const txs = data.transactions.filter((t) => {
    const d = new Date(t.time);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  const settings = { monthlyBudget: 3000, ...(readJSON("settings.json") || {}) };
  const totalSpent = txs.reduce((sum, t) => sum + t.amount, 0);
  const budget = settings.monthlyBudget;
  const remaining = budget - totalSpent;

  ctx.body = {
    year,
    month,
    budget,
    totalSpent: +totalSpent.toFixed(2),
    remaining: +remaining.toFixed(2),
    count: txs.length,
    transactions: txs,
  };
});

/** OpenAPI 路径定义 */
const apiDoc = {
  "/api/bills": {
    get: {
      tags: ["账单"],
      summary: "查询月度账单",
      description:
        "查询指定月份的消费汇总，包括预算、已花、剩余、日均及每笔明细。不传参数默认查询当月。",
      operationId: "getBills",
      parameters: [
        {
          name: "year",
          in: "query",
          description: "年份（默认当年）",
          schema: { type: "integer", example: 2026 },
        },
        {
          name: "month",
          in: "query",
          description: "月份 1-12（默认当月）",
          schema: { type: "integer", example: 5 },
        },
      ],
      responses: {
        200: {
          description: "成功",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  year: { type: "integer" },
                  month: { type: "integer" },
                  budget: { type: "number" },
                  totalSpent: { type: "number" },
                  remaining: { type: "number" },
                  count: { type: "integer" },
                  transactions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        amount: { type: "number" },
                        merchant: { type: "string" },
                        category: { type: "string" },
                        note: { type: "string" },
                        time: { type: "string" },
                        source: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export default router;
export { apiDoc };
