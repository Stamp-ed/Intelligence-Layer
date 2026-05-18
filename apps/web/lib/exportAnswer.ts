export function buildAnswerMarkdown(
  answer: string,
  meta?: { model?: string },
): string {
  const exportedAt = new Date().toISOString();
  const header = [
    "# Answer",
    "",
    `*Exported from Stamped Intelligence · ${exportedAt}*`,
  ];
  if (meta?.model?.trim()) {
    header.push(`*Model: ${meta.model.trim()}*`);
  }
  header.push("", "---", "");
  return `${header.join("\n")}${answer.trim()}\n`;
}

export function answerExportFilename(prefix = "stamped-answer"): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${prefix}-${stamp}.md`;
}

export function downloadTextFile(
  content: string,
  filename: string,
  mimeType = "text/markdown;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
