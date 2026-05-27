import { calculateBalance } from "../../../tools/calculator.js";
import { readJSON } from "../../../store.js";

/**
 * 余额检查节点：计算当月余额并评定风险等级。
 */
async function checkNode(state) {
  const { error } = state;
  if (error) return {};

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const settings = { monthlyBudget: 3000, alertThresholds: { warn: 0.5, critical: 0.2 }, ...(readJSON("settings.json") || {}) };
    const budget = settings.monthlyBudget;
    const thresholds = settings.alertThresholds;

    const result = await calculateBalance.invoke({ year, month, budget });
    const stats = JSON.parse(result);

    const ratio = stats.remaining / stats.budget;
    let riskLevel = "ok";
    if (ratio < thresholds.critical) {
      riskLevel = "critical";
    } else if (ratio < thresholds.warn) {
      riskLevel = "warn";
    }

    return {
      monthlyBudget: stats.budget,
      totalSpent: stats.totalSpent,
      remaining: stats.remaining,
      dailyBudget: stats.dailyBudget,
      remainingDays: stats.remainingDays,
      riskLevel,
    };
  } catch (err) {
    return { error: `计算失败: ${err.message}` };
  }
}

export { checkNode };
