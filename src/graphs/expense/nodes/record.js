import { addTransaction } from "../../../tools/ledger.js";

/**
 * 记录节点：将解析结果写入 transactions.json。
 */
async function recordNode(state) {
  const { transaction, source, rawInput, error, adviceOnly } = state;
  if (error || adviceOnly) return {};

  try {
    const result = await addTransaction.invoke({
      amount: transaction.amount,
      merchant: transaction.merchant,
      category: transaction.category,
      note: transaction.note,
      time: transaction.time,
      rawText: rawInput,
    });

    const saved = JSON.parse(result);
    // 覆盖 source 为实际识别的来源
    saved.source = source;

    return {};
  } catch (err) {
    return { error: `写入失败: ${err.message}` };
  }
}

export { recordNode };
