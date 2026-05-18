import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { config } from "../../config.js";
import {
  listCorpusDocuments,
  resolveDocumentBody,
} from "./corpusDocuments.js";

function escapeYaml(value: string): string {
  if (/[:#\n]/.test(value)) return JSON.stringify(value);
  return value;
}

export async function exportCorpus(): Promise<number> {
  const corpusDir = config.graphifyCorpusDir;
  await rm(corpusDir, { recursive: true, force: true });
  await mkdir(corpusDir, { recursive: true });

  const documents = await listCorpusDocuments();
  let exported = 0;

  for (const doc of documents) {
    const body = await resolveDocumentBody(doc);
    if (!body) continue;

    const frontmatter = [
      "---",
      `document_id: ${doc.id}`,
      `title: ${escapeYaml(doc.title ?? "Untitled")}`,
      `source_type: ${doc.sourceType}`,
      doc.channel ? `channel: ${escapeYaml(doc.channel)}` : null,
      doc.author ? `author: ${escapeYaml(doc.author)}` : null,
      `ingested_at: ${doc.ingestedAt.toISOString()}`,
      "---",
      "",
    ]
      .filter(Boolean)
      .join("\n");

    await writeFile(
      join(corpusDir, `${doc.id}.md`),
      frontmatter + body,
      "utf-8",
    );
    exported += 1;
  }

  return exported;
}
