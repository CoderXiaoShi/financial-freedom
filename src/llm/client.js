import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";

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

const defaultModel = createModel();

export { createModel, defaultModel };
