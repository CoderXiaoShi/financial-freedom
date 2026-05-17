import "dotenv/config";
import { expenseGraph } from "./graphs/expense/graph.js";
import { readJSON } from "./store.js";

const command = process.argv[2];
const input = process.argv.slice(3).join(" ");

async function main() {
  switch (command) {
    case "add":
      await handleAdd(input);
      break;
    case "balance":
      await handleBalance();
      break;
    case "advice":
      await handleAdvice();
      break;
    default:
      showHelp();
  }
}

async function handleAdd(text) {
  if (!text) {
    console.log("用法: node src/cli.js add <消费描述>");
    console.log("示例: node src/cli.js add 在星巴克买拿铁花了38元");
    process.exit(1);
  }

  console.log(`📝 解析中...`);
  const result = await expenseGraph.invoke({ rawInput: text });

  if (result.error) {
    console.log(`❌ 出错了: ${result.error}`);
    process.exit(1);
  }

  const t = result.transaction;
  console.log(`✅ 已记账: ${t.merchant} | ${t.category} | ¥${t.amount}`);
  console.log(`💳 余额: ¥${result.remaining} / ¥${result.monthlyBudget}`);
  console.log(`📊 风险: ${label(result.riskLevel)}`);

  if (result.advice) {
    console.log(`\n💬 财小喵: ${result.advice}`);
  }
}

async function handleBalance() {
  const settings = readJSON("settings.json") || { monthlyBudget: 3000 };
  const data = readJSON("transactions.json") || { transactions: [] };

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;

  const monthTxs = data.transactions.filter((t) => {
    const d = new Date(t.time);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  const totalSpent = monthTxs.reduce((sum, t) => sum + t.amount, 0);
  const budget = settings.monthlyBudget;
  const remaining = budget - totalSpent;
  const daily = daysLeft > 0 ? remaining / daysLeft : remaining;
  const ratio = remaining / budget;

  console.log(`\n📊 ${year}年${month}月 账单总览`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`💰 预算: ¥${budget}`);
  console.log(`💸 已花: ¥${totalSpent.toFixed(2)}`);
  console.log(`🏦 剩余: ¥${remaining.toFixed(2)}`);
  console.log(`📅 剩余 ${daysLeft} 天, 日均可用 ¥${daily.toFixed(2)}`);
  console.log(`📊 风险: ${label(ratio > 0.5 ? "ok" : ratio >= 0.2 ? "warn" : "critical")}`);

  if (monthTxs.length > 0) {
    console.log(`\n📋 最近 ${Math.min(5, monthTxs.length)} 笔:`);
    monthTxs.slice(-5).reverse().forEach((t) => {
      console.log(`  ${t.time?.slice(0, 10) || "?"} | ${t.merchant} | ${t.category} | ¥${t.amount}`);
    });
  }
}

async function handleAdvice() {
  const data = readJSON("transactions.json") || { transactions: [] };
  if (data.transactions.length === 0) {
    console.log("💬 财小喵: 还没有消费记录呢，先记一笔吧~");
    return;
  }

  const result = await expenseGraph.invoke({
    rawInput: "__ADVICE_ONLY__",
  });

  if (result.advice) {
    console.log(`💬 财小喵: ${result.advice}`);
  } else {
    console.log("💬 财小喵: 暂无建议，保持良好消费习惯！");
  }
}

function label(level) {
  return { ok: "✅ 健康", warn: "⚠️ 注意", critical: "🔴 危险" }[level] || level;
}

function showHelp() {
  console.log(`
🦊 财小喵 — AI 财务管家

用法:
  node src/cli.js add <消费描述>      手动记一笔账
  node src/cli.js balance            查看当月账单和余额
  node src/cli.js advice             获取 AI 消费建议
`);
}

main().catch((err) => {
  console.error("❌ 运行失败:", err.message);
  process.exit(1);
});
