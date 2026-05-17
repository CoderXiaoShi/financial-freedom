import { defaultModel } from "../../../llm/client.js";
import { readJSON } from "../../../store.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const character = readJSON("character.json");

/**
 * AI 顾问节点：根据风险等级，用角色化语气生成消费建议或警告。
 */
async function adviseNode(state) {
  const { riskLevel, monthlyBudget, totalSpent, remaining, dailyBudget, transaction, error } = state;
  if (error) return {};

  // ok 等级不做任何建议
  if (riskLevel === "ok") {
    return { advice: "" };
  }

  try {
    const recent = getRecentTransactions();

    const promptFile = riskLevel === "critical"
      ? "advise-severe.txt"
      : "advise-mild.txt";

    const prompt = loadPrompt(promptFile, {
      name: character.name,
      persona: character.persona,
      rules: character.rules ? character.rules.join("\n") : "",
      monthlyBudget,
      totalSpent,
      remaining,
      dailyBudget,
      recentTransactions: formatTransactions(recent),
    });

    const response = await defaultModel.invoke(prompt);
    const advice = response.content || "";

    return { advice };
  } catch (err) {
    return { advice: `顾问暂时不在：${err.message}` };
  }
}

function getRecentTransactions() {
  const data = readJSON("transactions.json") || { transactions: [] };
  return data.transactions.slice(-5).reverse();
}

function formatTransactions(txs) {
  return txs.map((t) =>
    `- ${t.time?.slice(0, 10) || "?"} | ${t.merchant} | ${t.category} | ¥${t.amount} | ${t.note || ""}`
  ).join("\n");
}

function loadPrompt(filename, vars) {
  const filepath = path.join(__dirname, "..", "..", "..", "llm", "prompts", filename);
  let template = fs.readFileSync(filepath, "utf-8");
  for (const [key, value] of Object.entries(vars)) {
    template = template.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value));
  }
  return template;
}

export { adviseNode };
