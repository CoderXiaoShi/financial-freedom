import Router from "koa-router";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expenseGraph } from "../graphs/expense/graph.js";
import { defaultModel } from "../llm/client.js";
import { synthToFile } from "../services/tts.js";
import { bus } from "../services/broadcast.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = new Router();
router.prefix("/api");

/**
 * POST /api/sms
 * 接收短信 webhook，解析后记账。
 * 记账完成后 LLM 判断是否需要语音通知，如需要则生成 TTS 并通过 SSE 推送。
 * Body: { sender, body, receivedAt }
 */
router.post("/sms", async (ctx) => {
  const { body, sender } = ctx.request.body;

  if (!body) {
    ctx.status = 400;
    ctx.body = { success: false, error: "缺少短信内容 body" };
    return;
  }

  // 1. 走完记账图
  const result = await expenseGraph.invoke({ rawInput: body });

  if (result.error) {
    ctx.status = 500;
    ctx.body = { success: false, error: result.error };
    return;
  }

  // 2. LLM 决策：是否需要语音通知
  let voiceUrl = null;
  if (result.advice && result.riskLevel !== "ok") {
    const shouldNotify = await shouldVoiceNotify(result);
    if (shouldNotify) {
      try {
        const audioDir = path.join(__dirname, "..", "..", "public", "audio");
        const filename = `tts-${Date.now()}.mp3`;
        await synthToFile(result.advice, { filename, outputDir: audioDir });
        voiceUrl = `/audio/${filename}`;

        // 3. 通过 SSE 推送到浏览器
        bus.emit("push", {
          type: "audio",
          url: voiceUrl,
          text: result.advice,
        });
      } catch (e) {
        console.error("TTS/SSE 失败:", e.message);
      }
    }
  }

  ctx.body = {
    success: true,
    transaction: result.transaction,
    balance: {
      totalSpent: result.totalSpent,
      remaining: result.remaining,
      dailyBudget: result.dailyBudget,
    },
    riskLevel: result.riskLevel,
    advice: result.advice || undefined,
    voiceUrl: voiceUrl || undefined,
  };
});

/**
 * LLM 判断当前这笔消费是否需要语音提醒。
 */
async function shouldVoiceNotify(result) {
  const prompt = `用户刚产生一笔消费：${result.transaction.merchant} ${result.transaction.category} ¥${result.transaction.amount}。
当前余额：¥${result.remaining}/¥${result.monthlyBudget}（风险等级：${result.riskLevel}）。
AI 已生成文字建议："${result.advice?.slice(0, 100)}"

作为财务管家，此时应该语音播报提醒用户吗？只回复 YES 或 NO。`;

  try {
    const res = await defaultModel.invoke(prompt);
    const answer = (res.content || "").trim().toUpperCase();
    return answer.includes("YES");
  } catch {
    // LLM 调用失败时，critical 默认播报
    return result.riskLevel === "critical";
  }
}

/** OpenAPI 路径定义 */
const apiDoc = {
  "/api/sms": {
    post: {
      tags: ["记账"],
      summary: "短信解析记账",
      description:
        "接收消费短信或手动输入，通过 AI 提取账单并自动记账。记账后 LLM 判断是否需要语音提醒，如需则通过 SSE 推送到前端页面。",
      operationId: "parseSms",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["body"],
              properties: {
                body: {
                  type: "string",
                  description: "短信原文或手动输入的消费描述",
                  example: "您在美团外卖消费42.5元，订单号12345",
                },
                sender: {
                  type: "string",
                  description: "短信发送者（可选）",
                  example: "美团",
                },
                receivedAt: {
                  type: "string",
                  description: "短信接收时间，ISO 8601（可选）",
                  example: "2026-05-17T10:30:00+08:00",
                },
              },
            },
            examples: {
              外卖消费: {
                value: { body: "您在美团外卖消费42.5元", sender: "美团" },
              },
              银行短信: {
                value: { body: "尾号8888借记卡消费286元【招商银行】", sender: "95516" },
              },
              手动输入: {
                value: { body: "在星巴克买了一杯拿铁38元" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "成功",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  transaction: {
                    type: "object",
                    properties: {
                      amount: { type: "number" },
                      merchant: { type: "string" },
                      category: { type: "string", enum: ["餐饮", "购物", "交通", "居住", "娱乐", "医疗", "其他"] },
                      note: { type: "string" },
                      time: { type: "string" },
                    },
                  },
                  balance: {
                    type: "object",
                    properties: {
                      totalSpent: { type: "number" },
                      remaining: { type: "number" },
                      dailyBudget: { type: "number" },
                    },
                  },
                  riskLevel: { type: "string", enum: ["ok", "warn", "critical"] },
                  advice: { type: "string", description: "AI 消费建议" },
                  voiceUrl: { type: "string", description: "语音文件 URL（仅当 LLM 决定播报时返回）" },
                },
              },
            },
          },
        },
        400: { description: "参数错误" },
        500: { description: "服务器错误" },
      },
    },
  },
};

export default router;
export { apiDoc };
