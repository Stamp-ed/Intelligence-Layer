import { isReasoningChatModel } from "../constants/openaiModels.js";

/** OpenAI chat params differ between GPT-4 class and o-series reasoning models */
export function chatTokenLimitParam(
  model: string,
  maxTokens: number,
): { max_tokens?: number; max_completion_tokens?: number } {
  if (isReasoningChatModel(model)) {
    return { max_completion_tokens: maxTokens };
  }
  return { max_tokens: maxTokens };
}
