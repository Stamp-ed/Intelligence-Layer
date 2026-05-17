import { preprocessText } from "../preprocessor.js";

export interface ParsedDocument {
  title: string;
  content: string;
  sourceType: string;
}

export function parseText(
  content: string,
  options: { title?: string; sourceType?: string } = {},
): ParsedDocument {
  const cleaned = preprocessText(content);
  const title =
    options.title ??
    cleaned.split("\n")[0]?.slice(0, 120) ??
    "Untitled Note";

  return {
    title,
    content: cleaned,
    sourceType: options.sourceType ?? "note",
  };
}
