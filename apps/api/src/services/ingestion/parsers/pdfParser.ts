import pdf from "pdf-parse";
import { preprocessText } from "../preprocessor.js";
import type { ParsedDocument } from "./textParser.js";

export interface PdfParseResult extends ParsedDocument {
  pageCount: number;
  metadata: Record<string, unknown>;
}

export async function parsePdf(
  buffer: Buffer,
  options: { fileName?: string; title?: string } = {},
): Promise<PdfParseResult> {
  const data = await pdf(buffer);
  const cleaned = preprocessText(data.text);

  const title =
    options.title ??
    (typeof data.info?.Title === "string" && data.info.Title.trim()
      ? data.info.Title
      : options.fileName?.replace(/\.pdf$/i, "") ?? "PDF Document");

  return {
    title,
    content: cleaned,
    sourceType: "pdf",
    pageCount: data.numpages,
    metadata: {
      page_count: data.numpages,
      pdf_info: data.info ?? {},
    },
  };
}
