import Router from "koa-router";
import { apiDoc as smsDoc } from "./sms.js";
import { apiDoc as billsDoc } from "./bills.js";
import { apiDoc as speakDoc } from "./speak.js";

const router = new Router();

/**
 * 自动合并所有 route 模块导出的 apiDoc，生成完整 OpenAPI 3.0 规范。
 * 新增 API 时只需在对应 route 文件中导出 apiDoc 即可，无需手动维护 spec。
 */
function buildSpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "至尊宝 — AI 财务管家 API",
      description:
        "AI 驱动的个人财务管理智能体。提供短信解析记账、账单查询、AI 消费建议、TTS 语音播报。",
      version: "0.2.0",
    },
    servers: [
      { url: "http://localhost:3000", description: "本地开发" },
    ],
    tags: [
      { name: "记账", description: "短信解析 & 自动记账" },
      { name: "账单", description: "账单查询 & 统计" },
      { name: "语音", description: "TTS 文本转语音" },
    ],
    paths: {
      ...smsDoc,
      ...billsDoc,
      ...speakDoc,
    },
  };
}

/** GET /api/swagger.json — 自动生成的 OpenAPI 规范 */
router.get("/api/swagger.json", (ctx) => {
  ctx.body = buildSpec();
});

/** GET /docs — Swagger UI 在线调试页面 */
router.get("/docs", (ctx) => {
  ctx.type = "text/html; charset=utf-8";
  ctx.body = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>至尊宝 API — Swagger</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    body { margin: 0; }
    .topbar { display: none; }
    .swagger-ui .info .title { font-size: 28px; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    SwaggerUIBundle({
      url: "/api/swagger.json",
      dom_id: "#swagger-ui",
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: "StandaloneLayout",
      defaultModelsExpandDepth: -1,
    });
  </script>
</body>
</html>`;
});

/** GET /player — TTS 语音播放器测试页 */
router.get("/player", (ctx) => {
  ctx.type = "text/html; charset=utf-8";
  ctx.body = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>TTS 语音测试</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 60px auto; padding: 24px; background: #111; color: #eee; }
    h1 { margin-bottom: 8px; }
    .sub { color: #888; margin-bottom: 24px; font-size: 14px; }
    textarea { width: 100%; height: 100px; padding: 12px; font-size: 15px; border: 1px solid #444; border-radius: 8px; background: #1a1a1a; color: #eee; resize: vertical; }
    .row { display: flex; gap: 12px; margin-top: 12px; margin-bottom: 20px; align-items: center; }
    button { padding: 10px 28px; font-size: 15px; border: none; border-radius: 8px; cursor: pointer; background: #7c3aed; color: #fff; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .presets { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .preset { padding: 6px 14px; background: #222; border: 1px solid #444; border-radius: 6px; cursor: pointer; font-size: 13px; color: #ccc; }
    .preset:hover { border-color: #7c3aed; color: #fff; }
    audio { width: 100%; margin-top: 20px; }
    .status { font-size: 13px; color: #888; min-height: 20px; }
  </style>
</head>
<body>
  <h1>🔊 至尊宝 TTS 语音测试</h1>
  <p class="sub">输入文本，点击生成即可试听。API: POST /api/speak → { url }</p>
  <textarea id="text" placeholder="输入要合成语音的文本...">这就对了嘛，接下来咱们要紧衣缩食啊</textarea>
  <div class="presets">
    <span class="preset" onclick="fill('这就对了嘛，接下来咱们要紧衣缩食啊')">温和提醒</span>
    <span class="preset" onclick="fill('你都买了啥！把没用的东西都退掉！！')">严厉警告</span>
    <span class="preset" onclick="fill('你的零花钱还有250块，坚持一下，马上就要发工资啦')">发工资倒计时</span>
    <span class="preset" onclick="fill('卧槽怎么回事！又花了32块钱！你都不看看你快没钱啦！')">震惊体</span>
  </div>
  <div class="row">
    <button id="btn" onclick="generate()">生成语音</button>
    <span class="status" id="status"></span>
  </div>
  <audio id="audio" controls style="display:none"></audio>
  <script>
    async function generate() {
      const btn = document.getElementById("btn");
      const status = document.getElementById("status");
      const audio = document.getElementById("audio");
      const text = document.getElementById("text").value.trim();
      if (!text) return;
      btn.disabled = true;
      status.textContent = "生成中...";
      try {
        const res = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error((await res.json()).error || res.statusText);
        const data = await res.json();
        audio.src = data.url;
        audio.style.display = "block";
        audio.play();
        status.textContent = "✅ " + data.url + " (" + (data.size / 1024).toFixed(0) + " KB)";
      } catch (e) {
        status.textContent = "❌ " + e.message;
      } finally {
        btn.disabled = false;
      }
    }
    function fill(t) { document.getElementById("text").value = t; }
  </script>
</body>
</html>`;
});

export default router;
