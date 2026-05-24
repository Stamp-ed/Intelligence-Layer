import { encode, decode } from "gpt-tokenizer";
import { config } from "../../config.js";

const SEPARATORS = ["\n\n", "\n", ". ", " "] as const;

export interface TextChunk {
  text: string;
  tokenCount: number;
  index: number;
}

function countTokens(text: string): number {
  return encode(text).length;
}

function splitBySeparator(text: string, separator: string): string[] {
  if (separator === " ") {
    return text.split(" ").filter(Boolean);
  }
  const parts = text.split(separator);
  return parts.map((p, i) => (i < parts.length - 1 ? p + separator : p)).filter(Boolean);
}

function mergeSplits(splits: string[], separator: string, maxTokens: number): string[] {
  const docs: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const split of splits) {
    const piece = current.length === 0 ? split : separator + split;
    const pieceTokens = countTokens(piece);

    if (currentTokens + pieceTokens > maxTokens && current.length > 0) {
      docs.push(current.join(separator === " " ? " " : ""));
      current = [split];
      currentTokens = countTokens(split);
    } else {
      current.push(split);
      currentTokens += pieceTokens;
    }
  }

  if (current.length > 0) {
    docs.push(current.join(separator === " " ? " " : ""));
  }

  return docs;
}

function splitTextRecursive(text: string, separators: readonly string[]): string[] {
  if (countTokens(text) <= config.chunkSize) {
    return [text];
  }

  const [sep, ...rest] = separators;
  if (!sep) {
    const tokens = encode(text);
    const chunks: string[] = [];
    for (let i = 0; i < tokens.length; i += config.chunkSize) {
      chunks.push(decode(tokens.slice(i, i + config.chunkSize)));
    }
    return chunks;
  }

  const splits = splitBySeparator(text, sep);
  if (splits.length === 1 && rest.length > 0) {
    return splitTextRecursive(text, rest);
  }

  const merged = mergeSplits(splits, sep, config.chunkSize);
  const result: string[] = [];
  for (const doc of merged) {
    if (countTokens(doc) > config.chunkSize && rest.length > 0) {
      result.push(...splitTextRecursive(doc, rest));
    } else {
      result.push(doc);
    }
  }
  return result;
}

export function chunkText(text: string): TextChunk[] {
  const rawChunks = splitTextRecursive(text, SEPARATORS);
  const withOverlap: string[] = [];

  for (let i = 0; i < rawChunks.length; i++) {
    let chunk = rawChunks[i];
    if (i > 0 && config.chunkOverlap > 0) {
      const prev = rawChunks[i - 1];
      const prevTokens = encode(prev);
      const overlapTokens = prevTokens.slice(-config.chunkOverlap);
      const overlapText = decode(overlapTokens);
      chunk = overlapText + chunk;
    }
    withOverlap.push(chunk);
  }

  let filtered = withOverlap
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && countTokens(t) >= config.minChunkSize);

  // Short sources (e.g. Discord messages) may be below minChunkSize — keep one chunk.
  if (filtered.length === 0) {
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      filtered = [trimmed];
    }
  }

  return filtered.map((t, index) => ({
    text: t,
    tokenCount: countTokens(t),
    index,
  }));
}
