"use client";

import { useCallback, useState } from "react";
import {
  answerExportFilename,
  buildAnswerMarkdown,
  downloadTextFile,
} from "@/lib/exportAnswer";

interface AnswerActionsProps {
  answer: string;
  modelUsed?: string;
}

export function AnswerActions({ answer, modelUsed }: AnswerActionsProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const markdown = buildAnswerMarkdown(answer, { model: modelUsed });

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2500);
    }
  }, [markdown]);

  const handleDownload = useCallback(() => {
    downloadTextFile(markdown, answerExportFilename());
  }, [markdown]);

  const copyLabel =
    copyState === "copied"
      ? "Copied"
      : copyState === "error"
        ? "Copy failed"
        : "Copy as Markdown";

  return (
    <footer
      className="answer-actions"
      style={{ borderColor: "rgba(43, 44, 48, 0.1)" }}
    >
      <button
        type="button"
        className="answer-action-btn"
        onClick={() => void handleCopy()}
        aria-label="Copy answer as Markdown"
      >
        {copyLabel}
      </button>
      <button
        type="button"
        className="answer-action-btn"
        onClick={handleDownload}
        aria-label="Download answer as Markdown file"
      >
        Download .md
      </button>
    </footer>
  );
}
