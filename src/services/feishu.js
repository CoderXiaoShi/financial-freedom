const APP_ID = process.env.FEISHU_APP_ID || "";
const APP_SECRET = process.env.FEISHU_APP_SECRET || "";

let cachedToken = null;
let tokenExpiresAt = 0;

async function getTenantAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }
  const resp = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
    }
  );
  const data = await resp.json();
  if (data.code !== 0) {
    throw new Error(`飞书 token 获取失败: ${data.msg} (code=${data.code})`);
  }
  cachedToken = data.tenant_access_token;
  tokenExpiresAt = Date.now() + (data.expire || 7200) * 1000;
  return cachedToken;
}

/**
 * 发送文本消息。
 * @param {string} receiveId - chat_id 或 open_id
 * @param {string} text - 消息文本
 * @param {string} idType - "chat_id" 或 "open_id"，默认 "chat_id"
 */
async function sendMessage(receiveId, text, idType = "chat_id") {
  const token = await getTenantAccessToken();
  const body = {
    receive_id: receiveId,
    msg_type: "text",
    content: JSON.stringify({ text }),
  };
  const resp = await fetch(
    `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${idType}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const data = await resp.json();
  if (data.code !== 0) {
    throw new Error(`飞书消息发送失败: ${data.msg} (code=${data.code})`);
  }
  return data;
}

/**
 * 发送卡片消息（支持富文本），用于复杂回复。
 */
async function sendCardMessage(receiveId, header, elements, idType = "chat_id") {
  const token = await getTenantAccessToken();
  const card = {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: header }, template: "wathet" },
    elements,
  };
  const body = {
    receive_id: receiveId,
    msg_type: "interactive",
    content: JSON.stringify(card),
  };
  const resp = await fetch(
    `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${idType}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const data = await resp.json();
  if (data.code !== 0) {
    throw new Error(`飞书卡片发送失败: ${data.msg} (code=${data.code})`);
  }
  return data;
}

export { getTenantAccessToken, sendMessage, sendCardMessage };
