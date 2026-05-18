import { mkdir, writeFile, readFile, stat, access, unlink } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";
import { constants } from "fs";
import { config } from "../../config.js";
import { prisma } from "../../lib/prisma.js";
import { exportCorpus } from "./corpusExportService.js";
import { countCorpusDocuments } from "./corpusDocuments.js";
import { buildExtractionFromDatabase } from "./graphExtractionBuilder.js";
import {
  type GraphTarget,
  getGraphOutDir,
  getGraphJsonPath,
  getGraphMetaPath,
  getGraphStalePath,
} from "./graphPaths.js";
import { corpusDocumentWhere } from "./corpusDocuments.js";

const META_FILE = "build-meta.json";

export interface GraphBuildMeta {
  built_at: string;
  node_count: number;
  edge_count: number;
  corpus_file_count: number;
  source: "graphify" | "fallback";
  graph_type: GraphTarget;
}

export function markGraphStale(target: GraphTarget = "corpus"): void {
  void writeFile(
    getGraphStalePath(target),
    new Date().toISOString(),
    "utf-8",
  ).catch(() => {});
}

let corpusRebuildTimer: ReturnType<typeof setTimeout> | null = null;
let corpusRebuildInFlight: Promise<GraphBuildMeta> | null = null;

/** Debounced background rebuild after document ingest or enrichment. */
export function scheduleCorpusGraphRebuild(): void {
  markGraphStale("corpus");
  if (corpusRebuildTimer) clearTimeout(corpusRebuildTimer);
  corpusRebuildTimer = setTimeout(() => {
    corpusRebuildTimer = null;
    if (corpusRebuildInFlight) return;
    corpusRebuildInFlight = rebuildCorpusGraph({ enrichEntities: false })
      .then((meta) => {
        console.info(
          `Corpus graph rebuilt: ${meta.node_count} nodes, ${meta.edge_count} edges`,
        );
        return meta;
      })
      .catch((err) => {
        console.error("Background corpus graph rebuild failed:", err);
        throw err;
      })
      .finally(() => {
        corpusRebuildInFlight = null;
      });
  }, 4000);
}

function countNodesInGraphJson(graphRaw: {
  nodes?: unknown[];
}): number {
  return graphRaw.nodes?.length ?? 0;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function runPythonRebuild(
  extractPath: string,
  outDir: string,
): Promise<{ ok: boolean; error?: string }> {
  const scriptPath = join(config.repoRoot, "scripts", "graphify_rebuild.py");

  return new Promise((resolve) => {
    const proc = spawn(
      config.pythonPath,
      [scriptPath, extractPath, outDir],
      { cwd: config.repoRoot, stdio: ["ignore", "pipe", "pipe"] },
    );

    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) resolve({ ok: true });
      else resolve({ ok: false, error: stderr || `exit ${code}` });
    });

    proc.on("error", (err) => {
      resolve({ ok: false, error: err.message });
    });
  });
}

function runProjectPipeline(
  outDir: string,
): Promise<{ ok: boolean; error?: string }> {
  const scriptPath = join(config.repoRoot, "scripts", "graphify_project_pipeline.py");

  return new Promise((resolve) => {
    const proc = spawn(config.pythonPath, [scriptPath, outDir], {
      cwd: config.repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) resolve({ ok: true });
      else resolve({ ok: false, error: stderr || `exit ${code}` });
    });

    proc.on("error", (err) => {
      resolve({ ok: false, error: err.message });
    });
  });
}

async function writeFallbackHtml(
  graphPath: string,
  htmlPath: string,
  title: string,
): Promise<void> {
  const data = await readFile(graphPath, "utf-8");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <script src="https://unpkg.com/vis-network@9.1.9/standalone/umd/vis-network.min.js"></script>
  <style>
    html, body { margin: 0; height: 100%; background: #F5F0E8; font-family: system-ui, sans-serif; }
    #graph { width: 100%; height: 100%; }
    #legend { position: fixed; top: 12px; left: 12px; background: #fff; padding: 8px 12px; border-radius: 8px; font-size: 12px; }
  </style>
</head>
<body>
  <div id="legend">${title}</div>
  <div id="graph"></div>
  <script>
    const raw = ${data};
    const nodes = (raw.nodes || []).map(n => ({
      id: n.id, label: n.label || n.id, title: n.label,
      color: n.file_type === 'document' ? '#1A6FC4' : '#F75440',
    }));
    const edges = (raw.links || raw.edges || []).map((e, i) => ({
      id: i, from: e.source, to: e.target, title: e.relation || '', arrows: 'to',
    }));
    new vis.Network(
      document.getElementById('graph'),
      { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) },
      { physics: { stabilization: { iterations: 120 } }, interaction: { hover: true } }
    );
  </script>
</body>
</html>`;
  await writeFile(htmlPath, html, "utf-8");
}

async function writeFallbackGraph(
  extraction: Awaited<ReturnType<typeof buildExtractionFromDatabase>>,
  outDir: string,
  graphType: GraphTarget,
): Promise<GraphBuildMeta> {
  await mkdir(outDir, { recursive: true });

  const graphJson = {
    nodes: extraction.nodes,
    links: extraction.edges.map((e) => ({
      source: e.source,
      target: e.target,
      relation: e.relation,
      confidence: e.confidence,
      confidence_score: e.confidence_score,
    })),
  };

  const graphPath = join(outDir, "graph.json");
  await writeFile(graphPath, JSON.stringify(graphJson, null, 2), "utf-8");

  const title =
    graphType === "project"
      ? "Stamped Project Graph"
      : "Stamped Knowledge Corpus Graph";
  try {
    await writeFallbackHtml(graphPath, join(outDir, "graph.html"), title);
  } catch {
    /* optional */
  }

  const meta: GraphBuildMeta = {
    built_at: new Date().toISOString(),
    node_count: extraction.nodes.length,
    edge_count: extraction.edges.length,
    corpus_file_count: 0,
    source: "fallback",
    graph_type: graphType,
  };
  await writeFile(join(outDir, META_FILE), JSON.stringify(meta, null, 2));
  return meta;
}

function corpusReport(meta: GraphBuildMeta): string {
  return `# Stamped Knowledge Corpus Graph

Built: ${meta.built_at}
Nodes: ${meta.node_count} · Edges: ${meta.edge_count}
Corpus files: ${meta.corpus_file_count}

## God Nodes

_(Run \`/graphify data/corpus\` in Cursor for full semantic extraction.)_

## Suggested Questions

- How do competitors connect across ingested research?
- What regulations appear with fraud modules in our uploads?
`;
}

export async function rebuildCorpusGraph(options: {
  enrichEntities?: boolean;
} = {}): Promise<GraphBuildMeta> {
  const outDir = getGraphOutDir("corpus");
  await mkdir(outDir, { recursive: true });

  if (options.enrichEntities) {
    const docs = await prisma.document.findMany({
      where: {
        AND: [
          corpusDocumentWhere,
          {
            OR: [
              { summary: null },
              { chunks: { some: { entityMentions: { none: {} } } } },
            ],
          },
        ],
      },
      select: { id: true },
    });
    const { enrichDocument } = await import("../entities/documentEnrichment.js");
    for (const doc of docs) {
      await enrichDocument(doc.id);
    }
  }

  const corpusCount = await exportCorpus();
  const documentCount = await countCorpusDocuments();

  if (corpusCount === 0) {
    const meta: GraphBuildMeta = {
      built_at: new Date().toISOString(),
      node_count: 0,
      edge_count: 0,
      corpus_file_count: documentCount,
      source: "fallback",
      graph_type: "corpus",
    };
    await writeFile(join(outDir, META_FILE), JSON.stringify(meta, null, 2));
    await writeFile(
      join(outDir, "GRAPH_REPORT.md"),
      documentCount > 0
        ? `# Corpus Graph\n\nFound ${documentCount} document(s) but none could be exported (missing text). Re-ingest or check chunk data.\n`
        : `# Corpus Graph\n\nNo ingested documents yet. Ingest content first, then rebuild.\n`,
      "utf-8",
    );
    return meta;
  }

  const extraction = await buildExtractionFromDatabase();
  const extractPath = join(outDir, "extraction.json");
  await writeFile(extractPath, JSON.stringify(extraction, null, 2), "utf-8");

  const pyResult = await runPythonRebuild(extractPath, outDir);

  let meta: GraphBuildMeta;

  if (pyResult.ok && (await fileExists(join(outDir, "graph.json")))) {
    const graphRaw = JSON.parse(
      await readFile(join(outDir, "graph.json"), "utf-8"),
    ) as { nodes?: unknown[]; links?: unknown[]; edges?: unknown[] };
    const graphNodeCount = countNodesInGraphJson(graphRaw);
    const graphEdgeCount =
      graphRaw.links?.length ?? graphRaw.edges?.length ?? 0;

    if (graphNodeCount === 0 && extraction.nodes.length > 0) {
      console.warn(
        "Graphify produced an empty corpus graph; using database fallback.",
      );
      meta = await writeFallbackGraph(extraction, outDir, "corpus");
      meta.corpus_file_count = corpusCount;
      meta.source = "fallback";
    } else {
      meta = {
        built_at: new Date().toISOString(),
        node_count: graphNodeCount || extraction.nodes.length,
        edge_count: graphEdgeCount || extraction.edges.length,
        corpus_file_count: corpusCount,
        source: "graphify",
        graph_type: "corpus",
      };
    }
  } else {
    if (pyResult.error) {
      console.warn("Corpus graphify rebuild:", pyResult.error);
    }
    meta = await writeFallbackGraph(extraction, outDir, "corpus");
    meta.corpus_file_count = corpusCount;
  }

  await writeFile(join(outDir, META_FILE), JSON.stringify(meta, null, 2));
  await writeFile(join(outDir, "GRAPH_REPORT.md"), corpusReport(meta), "utf-8");

  const stalePath = getGraphStalePath("corpus");
  if (await fileExists(stalePath)) {
    await unlink(stalePath).catch(() => {});
  }

  return meta;
}

export async function rebuildProjectGraph(): Promise<GraphBuildMeta> {
  const outDir = getGraphOutDir("project");
  await mkdir(outDir, { recursive: true });

  const pyResult = await runProjectPipeline(outDir);

  if (pyResult.ok && (await fileExists(join(outDir, "graph.json")))) {
    const meta = JSON.parse(
      await readFile(join(outDir, META_FILE), "utf-8"),
    ) as GraphBuildMeta;
    return { ...meta, graph_type: "project" };
  }

  if (pyResult.error) {
    console.warn("Project graph pipeline:", pyResult.error);
  }

  const meta: GraphBuildMeta = {
    built_at: new Date().toISOString(),
    node_count: 0,
    edge_count: 0,
    corpus_file_count: 0,
    source: "fallback",
    graph_type: "project",
  };
  await writeFile(join(outDir, META_FILE), JSON.stringify(meta, null, 2));
  await writeFile(
    join(outDir, "GRAPH_REPORT.md"),
    `# Project Graph\n\nRebuild failed. Run \`/graphify .\` in Cursor or install graphifyy.\n\n${pyResult.error ?? ""}\n`,
    "utf-8",
  );
  return meta;
}

export async function rebuildGraph(options: {
  target?: GraphTarget;
  enrichEntities?: boolean;
} = {}): Promise<GraphBuildMeta> {
  const target = options.target ?? "corpus";
  if (target === "project") {
    return rebuildProjectGraph();
  }
  return rebuildCorpusGraph({ enrichEntities: options.enrichEntities });
}

export async function getGraphStatus(target: GraphTarget = "corpus"): Promise<{
  graph_type: GraphTarget;
  built_at: string | null;
  node_count: number;
  edge_count: number;
  corpus_file_count: number;
  document_count: number;
  needs_rebuild: boolean;
  source: string | null;
}> {
  const outDir = getGraphOutDir(target);
  const metaPath = getGraphMetaPath(target);
  const graphPath = getGraphJsonPath(target);
  const stalePath = getGraphStalePath(target);

  let needsRebuild = await fileExists(stalePath);

  if (target === "corpus" && !needsRebuild && (await fileExists(graphPath))) {
    const corpusDir = config.graphifyCorpusDir;
    try {
      const graphStat = await stat(graphPath);
      const { readdir } = await import("fs/promises");
      const files = await readdir(corpusDir).catch(() => []);
      for (const f of files) {
        if (!f.endsWith(".md")) continue;
        const fStat = await stat(join(corpusDir, f));
        if (fStat.mtime > graphStat.mtime) {
          needsRebuild = true;
          break;
        }
      }
    } catch {
      /* ignore */
    }
  }

  const documentCount =
    target === "corpus" ? await countCorpusDocuments() : 0;

  if (!(await fileExists(metaPath))) {
    return {
      graph_type: target,
      built_at: null,
      node_count: 0,
      edge_count: 0,
      corpus_file_count: documentCount,
      document_count: documentCount,
      needs_rebuild: documentCount > 0 || needsRebuild,
      source: null,
    };
  }

  const meta = JSON.parse(
    await readFile(metaPath, "utf-8"),
  ) as GraphBuildMeta;

  const nodeCount = meta.node_count;
  if (target === "corpus" && documentCount > 0 && nodeCount === 0) {
    needsRebuild = true;
  }

  return {
    graph_type: target,
    built_at: meta.built_at,
    node_count: nodeCount,
    edge_count: meta.edge_count,
    corpus_file_count: meta.corpus_file_count || documentCount,
    document_count: documentCount,
    needs_rebuild: needsRebuild,
    source: meta.source,
  };
}

export async function getBothGraphStatuses(): Promise<{
  project: Awaited<ReturnType<typeof getGraphStatus>>;
  corpus: Awaited<ReturnType<typeof getGraphStatus>>;
}> {
  const [project, corpus] = await Promise.all([
    getGraphStatus("project"),
    getGraphStatus("corpus"),
  ]);
  return { project, corpus };
}
