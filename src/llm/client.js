import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import log4js from "log4js";

const llmLogger = log4js.getLogger("llm");

const providerConfigs = {
  deepseek: {
    model: process.env.LLM_MODEL || "deepseek-chat",
    apiKey: process.env.LLM_API_KEY,
    configuration: { baseURL: process.env.LLM_BASE_URL || "https://api.deepseek.com" },
  },
  openai: {
    model: process.env.LLM_MODEL || "gpt-4o",
    apiKey: process.env.LLM_API_KEY,
  },
};

function createModel(options = {}) {
  const provider = process.env.LLM_PROVIDER || "deepseek";
  const config = providerConfigs[provider];
  if (!config) {
    throw new Error(`Unknown LLM provider: ${provider}`);
  }
  return new ChatOpenAI({
    ...config,
    temperature: process.env.LLM_TEMPERATURE ? parseFloat(process.env.LLM_TEMPERATURE) : 0.3,
    ...options,
  });
}

const rawModel = createModel();

function wrapModel(model) {
  const origInvoke = model.invoke.bind(model);
  model.invoke = async (input) => {
    const inputSummary = summarizeInput(input);
    llmLogger.info(`--> LLM 请求`, { input: inputSummary });
    const start = Date.now();
    try {
      const result = await origInvoke(input);
      const outputSummary = summarizeOutput(result);
      llmLogger.info(`<-- LLM 响应 ${Date.now() - start}ms`, { output: outputSummary });
      return result;
    } catch (err) {
      llmLogger.error(`LLM 调用失败 ${Date.now() - start}ms`, { error: err.message });
      throw err;
    }
  };
  return model;
}

function summarizeInput(input) {
  if (typeof input === "string") return input.slice(0, 500);
  if (Array.isArray(input)) {
    return input.map((m) => ({ role: m.role, content: String(m.content || "").slice(0, 300) }));
  }
  return String(input).slice(0, 500);
}

function summarizeOutput(result) {
  const content = result?.content || result;
  if (typeof content === "string") return content.slice(0, 500);
  return JSON.stringify(content).slice(0, 500);
}

const defaultModel = wrapModel(rawModel);

export { createModel, defaultModel };
