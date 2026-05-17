import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { readJSON } from "../store.js";

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function daysLeftInMonth() {
  const now = new Date();
  const total = daysInMonth(now.getFullYear(), now.getMonth() + 1);
  return total - now.getDate() + 1;
}

const calculateBalance = tool(
  async ({ year, month, budget }) => {
    const data = readJSON("transactions.json") || { transactions: [] };
    const txs = data.transactions.filter((t) => {
      const d = new Date(t.time);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    const totalSpent = txs.reduce((sum, t) => sum + t.amount, 0);
    const remaining = budget - totalSpent;
    const remainingDays = daysLeftInMonth();
    const dailyBudget = remainingDays > 0 ? +(remaining / remainingDays).toFixed(2) : remaining;

    return JSON.stringify({
      year,
      month,
      budget,
      totalSpent: +totalSpent.toFixed(2),
      remaining: +remaining.toFixed(2),
      remainingDays,
      dailyBudget,
    });
  },
  {
    name: "calculate_balance",
    description: "计算指定月份的消费统计：已消费金额、剩余额度、剩余天数、日均可用。",
    schema: z.object({
      year: z.number().describe("年份，如 2026"),
      month: z.number().describe("月份，1-12"),
      budget: z.number().describe("该月总预算额度（元）"),
    }),
  }
);

export { calculateBalance };
