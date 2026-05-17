import { parseMarkdown } from "./markdownParser.js";
import { parsePdf } from "./pdfParser.js";
import { parseText, type ParsedDocument } from "./textParser.js";

export function getFileExtension(fileName: string): string {
  return fileName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
}

export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".markdown", ".pdf"] as const;

export async function parseFileBuffer(
  buffer: Buffer,
  fileName: string,
): Promise<ParsedDocument & { metadata?: Record<string, unknown> }> {
  const ext = getFileExtension(fileName);

  if (ext === ".pdf") {
    const parsed = await parsePdf(buffer, { fileName });
    return {
      title: parsed.title,
      content: parsed.content,
      sourceType: parsed.sourceType,
      metadata: parsed.metadata,
    };
  }

  const content = buffer.toString("utf8");

  if (ext === ".md" || ext === ".markdown") {
    return parseMarkdown(content, { fileName });
  }

  if (ext === ".txt") {
    return parseText(content, { title: fileName, sourceType: "markdown" });
  }

  throw new Error(`Unsupported file type: ${ext}`);
}
