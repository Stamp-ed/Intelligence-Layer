import { readFile } from "fs/promises";
import { config } from "../../config.js";

interface GraphNode {
  id: string;
  label?: string;
  source_file?: string;
}

interface GraphLink {
  source: string;
  target: string;
  confidence?: string;
  confidence_score?: number;
}

interface GraphFile {
  nodes?: GraphNode[];
  links?: GraphLink[];
}

function documentIdFromSourceFile(sourceFile: string): string | null {
  const match = sourceFile.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.md$/i,
  );
  return match?.[1] ?? null;
}

export async function expandChunksViaGraph(
  query: string,
  seedChunkIds: string[],
  maxDepth = 2,
): Promise<string[]> {
  if (!config.graphExpansionEnabled) return [];

  let graph: GraphFile;
  try {
    graph = JSON.parse(
      await readFile(config.graphifyCorpusGraphJson, "utf-8"),
    ) as GraphFile;
  } catch {
    return [];
  }

  const nodes = graph.nodes ?? [];
  const links = graph.links ?? [];

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 3);

  const startIds = nodes
    .filter((n) => {
      const label = (n.label ?? n.id).toLowerCase();
      return terms.some((t) => label.includes(t));
    })
    .map((n) => n.id)
    .slice(0, 5);

  if (startIds.length === 0) return [];

  const adjacency = new Map<string, Array<{ neighbor: string; score: number }>>();
  for (const link of links) {
    const score =
      link.confidence === "EXTRACTED"
        ? 1
        : (link.confidence_score ?? 0.5);
    if (!adjacency.has(link.source)) adjacency.set(link.source, []);
    adjacency.get(link.source)!.push({ neighbor: link.target, score });
    if (!adjacency.has(link.target)) adjacency.set(link.target, []);
    adjacency.get(link.target)!.push({ neighbor: link.source, score });
  }

  const visited = new Set<string>(startIds);
  let frontier = [...startIds];

  for (let d = 0; d < maxDepth; d++) {
    const next: string[] = [];
    for (const nodeId of frontier) {
      for (const { neighbor } of adjacency.get(nodeId) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }

  const docIds = new Set<string>();
  for (const nodeId of visited) {
    const node = nodes.find((n) => n.id === nodeId);
    if (node?.source_file) {
      const docId = documentIdFromSourceFile(node.source_file);
      if (docId) docIds.add(docId);
    }
  }

  if (docIds.size === 0) return [];

  const { prisma } = await import("../../lib/prisma.js");
  const chunks = await prisma.chunk.findMany({
    where: { documentId: { in: [...docIds] } },
    select: { id: true },
    take: 12,
  });

  const expanded = chunks.map((c) => c.id).filter((id) => !seedChunkIds.includes(id));
  return expanded;
}
