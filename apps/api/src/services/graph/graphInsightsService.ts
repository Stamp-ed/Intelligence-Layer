import { readFile } from "fs/promises";
import { join } from "path";
import type { GraphTarget } from "./graphPaths.js";
import { getGraphOutDir } from "./graphPaths.js";

export interface GraphInsights {
  god_nodes: string[];
  surprising_connections: string[];
  suggested_questions: string[];
  report_excerpt?: string;
}

function parseSection(markdown: string, heading: string): string[] {
  const re = new RegExp(`## ${heading}[\\s\\S]*?(?=\\n## |$)`, "i");
  const match = markdown.match(re);
  if (!match) return [];

  return match[0]
    .split("\n")
    .slice(1)
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter((l) => l.length > 0 && !l.startsWith("_"));
}

export async function getGraphInsights(
  target: GraphTarget = "corpus",
): Promise<GraphInsights> {
  const reportPath = join(getGraphOutDir(target), "GRAPH_REPORT.md");

  try {
    const md = await readFile(reportPath, "utf-8");
    return {
      god_nodes: parseSection(md, "God Nodes"),
      surprising_connections: parseSection(md, "Surprising Connections"),
      suggested_questions: parseSection(md, "Suggested Questions"),
      report_excerpt: md.slice(0, 2000),
    };
  } catch {
    const fallback =
      target === "project"
        ? [
            "How does ingestion connect to graph rebuild?",
            "What modules implement Phase 3 graph intelligence?",
          ]
        : [
            "How do competitors connect across ingested research?",
            "What regulations appear with fraud modules?",
          ];
    return {
      god_nodes: [],
      surprising_connections: [],
      suggested_questions: fallback,
    };
  }
}
