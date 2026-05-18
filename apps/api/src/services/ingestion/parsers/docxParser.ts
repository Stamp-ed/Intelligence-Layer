import mammoth from "mammoth";
import { preprocessText } from "../preprocessor.js";
import type { ParsedDocument } from "./textParser.js";

export interface DocxParseResult extends ParsedDocument {
  metadata: Record<string, unknown>;
}

export async function parseDocx(
  buffer: Buffer,
  options: { fileName?: string; title?: string } = {},
): Promise<DocxParseResult> {
  const result = await mammoth.extractRawText({ buffer });
  const cleaned = preprocessText(result.value);

  const title =
    options.title ??
    options.fileName?.replace(/\.docx$/i, "") ??
    "Untitled Document";

  return {
    title,
    content: cleaned,
    sourceType: "markdown",
    metadata: {
      file_name: options.fileName,
      parser: "mammoth",
      warnings: result.messages?.length ?? 0,
    },
  };
}
