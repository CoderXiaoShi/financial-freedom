import { defaultModel } from "../../../llm/client.js";

/**
 * LLM 解析节点：将清洗后的文本发给 LLM 提取结构化账单。
 * 使用单条 user message + JSON 解析，兼容 DeepSeek。
 */
async function parseNode(state) {
  const { rawInput, error, adviceOnly } = state;
  if (error || adviceOnly) return {};

  try {
    const response = await defaultModel.invoke([
      { role: "user", content: buildPrompt(rawInput) },
    ]);

    const text = response.content?.trim() || "";
    const json = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(json);

    return {
      transaction: {
        amount: Number(parsed.amount),
        merchant: String(parsed.merchant || ""),
        category: validCategory(parsed.category) ? parsed.category : "其他",
        note: String(parsed.note || ""),
        time: String(parsed.time || new Date().toISOString()),
      },
    };
  } catch (err) {
    return { error: `解析失败: ${err.message}` };
  }
}

const CATEGORIES = ["餐饮", "购物", "交通", "居住", "娱乐", "医疗", "其他"];
function validCategory(c) {
  return CATEGORIES.includes(c);
}

function buildPrompt(input) {
  return `从下面的消费文本中提取账单信息，返回 JSON。

示例：
"在美团外卖消费42.5元，订单号12345" → {"amount":42.5,"merchant":"美团外卖","category":"餐饮","note":"","time":"2026-05-17"}
"星巴克买拿铁38元" → {"amount":38,"merchant":"星巴克","category":"餐饮","note":"拿铁","time":"2026-05-17"}
"滴滴出行扣款15.8元" → {"amount":15.8,"merchant":"滴滴出行","category":"交通","note":"","time":"2026-05-17"}

重要：merchant 填平台名或品牌名，不要填订单号/流水号/尾号！

现在提取：
"${input}"

只返回 JSON：`;
}

export { parseNode };
