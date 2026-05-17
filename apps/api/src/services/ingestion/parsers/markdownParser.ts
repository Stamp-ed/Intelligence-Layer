import { preprocessText } from "../preprocessor.js";
import type { ParsedDocument } from "./textParser.js";

export function parseMarkdown(
  content: string,
  options: { title?: string; fileName?: string } = {},
): ParsedDocument {
  const cleaned = preprocessText(content);
  let title = options.title;

  if (!title) {
    const headingMatch = cleaned.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      title = headingMatch[1].trim();
    } else if (options.fileName) {
      title = options.fileName.replace(/\.(md|markdown)$/i, "");
    } else {
      title = cleaned.split("\n")[0]?.slice(0, 120) ?? "Untitled Document";
    }
  }

  return {
    title,
    content: cleaned,
    sourceType: "markdown",
  };
}
