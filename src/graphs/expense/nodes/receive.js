/**
 * 输入归一化节点：接收原始文本，清洗后统一格式。
 * 支持短信原文和手动文本两种来源。
 */
async function receiveNode(state) {
  const { rawInput } = state;

  if (!rawInput || !rawInput.trim()) {
    return { error: "输入为空" };
  }

  // 特殊标记：仅触发余额检查和顾问建议，不新增交易
  if (rawInput === "__ADVICE_ONLY__") {
    return {
      adviceOnly: true,
      source: "system",
      error: null,
    };
  }

  // 去除常见短信服务商前缀和尾缀
  let cleaned = rawInput
    .replace(/【.*?】/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/尾号\d+的借记卡/g, "借记卡")
    .replace(/您的借记卡/g, "借记卡")
    .trim();

  // 判断来源
  const isSMS = /银行|借记卡|信用卡|银联|消费|支付|扣款/.test(rawInput);
  const source = isSMS ? "sms" : "manual";

  return {
    rawInput: cleaned,
    source,
    adviceOnly: false,
    error: null,
  };
}

export { receiveNode };
