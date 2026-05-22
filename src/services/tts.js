import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TTS_URL = "https://openspeech.bytedance.com/api/v1/tts";
const TTS_API_KEY = process.env.TTS_API_KEY || "";
const VOICE_TYPE = process.env.TTS_VOICE_TYPE || "S_4BJYYsm32";
const SPEED_RATIO = parseFloat(process.env.TTS_SPEED_RATIO || "1.0");

/**
 * 调用豆包火山引擎 TTS，将文本转为 mp3 buffer。
 * @param {string} text - 要合成的文本
 * @param {object} options - 可选覆盖
 * @returns {Promise<Buffer>} mp3 音频数据
 */
async function synthesize(text, options = {}) {
  if (!text || !text.trim()) {
    throw new Error("TTS: 文本为空");
  }
  if (!TTS_API_KEY) {
    throw new Error("TTS: 未配置 TTS_API_KEY");
  }

  const body = JSON.stringify({
    app: { cluster: "volcano_icl" },
    user: { uid: "豆包语音" },
    audio: {
      voice_type: options.voiceType || VOICE_TYPE,
      encoding: "mp3",
      speed_ratio: options.speedRatio || SPEED_RATIO,
    },
    request: {
      reqid: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text: text.trim(),
      operation: "query",
    },
  });

  const res = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      "x-api-key": TTS_API_KEY,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`TTS API 返回 ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();

  const audioField = json.data || json.audio || json.audio_data || json.result;
  if (!audioField) {
    throw new Error(`TTS 响应中未找到音频数据，keys: ${Object.keys(json).join(", ")}`);
  }

  if (typeof audioField === "string") {
    if (audioField.startsWith("http")) {
      const audioRes = await fetch(audioField);
      const arrayBuffer = await audioRes.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    return Buffer.from(audioField, "base64");
  }

  throw new Error(`TTS: 无法处理的音频数据类型: ${typeof audioField}`);
}

/**
 * 合成语音并保存到文件。
 * @param {string} text
 * @param {object} options - filename, outputDir (默认 data/), voiceType, speedRatio
 * @returns {Promise<string>} 文件路径
 */
async function synthToFile(text, options = {}) {
  const buf = await synthesize(text, options);
  const outputDir = options.outputDir || path.join(__dirname, "..", "..", "data");
  const filename = options.filename || "latest-advice.mp3";

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 目录内文件总量超过 100MB 则清空
  const MAX_SIZE = 100 * 1024 * 1024;
  let totalSize = 0;
  const files = fs.readdirSync(outputDir);
  for (const f of files) {
    const stat = fs.statSync(path.join(outputDir, f));
    if (stat.isFile()) totalSize += stat.size;
  }
  if (totalSize + buf.length > MAX_SIZE) {
    for (const f of files) {
      fs.unlinkSync(path.join(outputDir, f));
    }
  }

  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, buf);
  return filepath;
}

export { synthesize, synthToFile };
