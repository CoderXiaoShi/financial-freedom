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

  const settings = readJSON("settings.json") || { monthlyBudget: 3000 };
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

export default router;
