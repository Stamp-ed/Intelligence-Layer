const INGEST_EXTENSIONS = new Set([".md", ".markdown", ".pdf", ".docx", ".txt"]);

export function getAttachmentExtension(fileName: string): string {
  return fileName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
}

export function isIngestibleAttachment(fileName: string): boolean {
  return INGEST_EXTENSIONS.has(getAttachmentExtension(fileName));
}

export function maxAttachmentBytes(maxMb: number): number {
  return maxMb * 1024 * 1024;
}
