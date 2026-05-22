import Router from "koa-router";
import { synthToFile } from "../services/tts.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = new Router();
router.prefix("/api");

/**
 * POST /api/speak
 * 文本转语音。Body: { text, voiceType?, speedRatio? }
 * 音频写入 public/audio/ 目录，返回静态资源 URL。
 */
router.post("/speak", async (ctx) => {
  const { text, voiceType, speedRatio } = ctx.request.body;

  if (!text || !text.trim()) {
    ctx.status = 400;
    ctx.body = { success: false, error: "缺少 text 参数" };
    return;
  }

  try {
    const audioDir = path.join(__dirname, "..", "..", "public", "audio");
    const filename = `tts-${Date.now()}.mp3`;
    const filepath = await synthToFile(text, {
      filename,
      outputDir: audioDir,
      voiceType,
      speedRatio: speedRatio ? parseFloat(speedRatio) : undefined,
    });

    const stat = fs.statSync(filepath);
    ctx.body = {
      success: true,
      url: `/audio/${filename}`,
      size: stat.size,
    };
  } catch (err) {
    ctx.status = 500;
    ctx.body = { success: false, error: `TTS 失败: ${err.message}` };
  }
});

/** OpenAPI 路径定义 */
const apiDoc = {
  "/api/speak": {
    post: {
      tags: ["语音"],
      summary: "文本转语音（TTS）",
      description:
        "将文本合成为 MP3 语音（豆包火山引擎 TTS），使用至尊宝语音克隆音色。音频保存到 public/audio/，返回可直接访问的 URL。",
      operationId: "textToSpeech",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["text"],
              properties: {
                text: {
                  type: "string",
                  description: "要合成语音的文本",
                  example: "你的零花钱还有250块，坚持一下，马上就要发工资啦~",
                },
                voiceType: {
                  type: "string",
                  description: "音色 ID（可选，默认至尊宝语音克隆）",
                  example: "S_4BJYYsm32",
                },
                speedRatio: {
                  type: "number",
                  description: "语速比例（可选，默认 1.0）",
                  example: 1.0,
                },
              },
            },
            examples: {
              温和提醒: {
                value: { text: "这就对了嘛，接下来咱们要紧衣缩食啊" },
              },
              严厉警告: {
                value: { text: "你都买了啥！把没用的东西都退掉！！" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "成功，返回音频 URL",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  url: {
                    type: "string",
                    description: "音频静态资源 URL，可直接在浏览器打开或下载",
                    example: "/audio/tts-1779462641030.mp3",
                  },
                  size: { type: "integer", description: "文件大小（字节）" },
                },
              },
            },
          },
        },
        400: { description: "参数错误" },
        500: { description: "TTS 失败" },
      },
    },
  },
};

export default router;
export { apiDoc };
