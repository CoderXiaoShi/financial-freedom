import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { readJSON, writeJSON } from "../store.js";
import { v4 as uuidv4 } from "uuid";

const addTransaction = tool(
  async ({ amount, merchant, category, note, time, rawText }) => {
    const data = readJSON("transactions.json") || { transactions: [] };
    const txn = {
      id: uuidv4(),
      amount,
      merchant,
      category,
      note: note || "",
      time: time || new Date().toISOString(),
      source: "sms",
      rawText: rawText || "",
      createdAt: new Date().toISOString(),
    };
    data.transactions.push(txn);
    writeJSON("transactions.json", data);
    return JSON.stringify(txn);
  },
  {
    name: "add_transaction",
    description: "添加一条消费记录到账本。写入后返回该记录的 JSON。",
    schema: z.object({
      amount: z.number().describe("消费金额（元）"),
      merchant: z.string().describe("商户/品牌名称"),
      category: z.string().describe("消费分类：餐饮|购物|交通|居住|娱乐|医疗|其他"),
      note: z.string().optional().describe("补充备注，如具体买了什么"),
      time: z.string().optional().describe("消费时间，ISO 8601 格式"),
      rawText: z.string().optional().describe("短信原文"),
    }),
  }
);

const queryTransactions = tool(
  async ({ year, month }) => {
    const data = readJSON("transactions.json") || { transactions: [] };
    const filtered = data.transactions.filter((t) => {
      const d = new Date(t.time);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    return JSON.stringify(filtered);
  },
  {
    name: "query_transactions",
    description: "查询指定年月的所有消费记录，返回 JSON 数组。",
    schema: z.object({
      year: z.number().describe("年份，如 2026"),
      month: z.number().describe("月份，1-12"),
    }),
  }
);

export { addTransaction, queryTransactions };
