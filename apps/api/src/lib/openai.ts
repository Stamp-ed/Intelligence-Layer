import OpenAI from "openai";
import { config } from "../config.js";

export const openai = new OpenAI({
  apiKey: config.openaiApiKey || "not-set",
});

export async function checkOpenAIHealth(): Promise<boolean> {
  if (!config.openaiApiKey) return false;
  try {
    await openai.models.list();
    return true;
  } catch {
    return false;
  }
}
