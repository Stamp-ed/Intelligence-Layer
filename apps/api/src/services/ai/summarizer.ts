import { openai } from "../../lib/openai.js";
import { config } from "../../config.js";

export async function summarizeDocument(
  title: string,
  content: string,
): Promise<string> {
  const excerpt = content.length > 8000 ? content.slice(0, 8000) + "…" : content;

  const completion = await openai.chat.completions.create({
    model: config.standardModel,
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content:
          "Summarize internal Stamped knowledge documents in 2–4 sentences. Capture main purpose and key claims. No preamble.",
      },
      {
        role: "user",
        content: `Title: ${title}\n\n${excerpt}`,
      },
    ],
  });

  return (
    completion.choices[0]?.message?.content?.trim() ??
    "Summary unavailable."
  );
}
