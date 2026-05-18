import { readFile } from "fs/promises";
import { prisma } from "../../lib/prisma.js";
import { corpusDocumentWhere } from "./corpusDocuments.js";
import { getGraphJsonPath, type GraphTarget } from "./graphPaths.js";

export interface SigmaGraphNode {
  id: string;
  label: string;
  size: number;
  color: string;
  x: number;
  y: number;
  nodeType: "channel" | "document" | "entity" | "code";
  channel: string | null;
  documentId?: string;
  sourceType?: string;
}

export interface SigmaGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface SigmaGraphPayload {
  nodes: SigmaGraphNode[];
  edges: SigmaGraphEdge[];
  channels: string[];
}

const PALETTE = [
  "#F75440",
  "#1A6FC4",
  "#5865F2",
  "#0D9488",
  "#CA8A04",
  "#9333EA",
  "#DB2777",
  "#475569",
];

function colorForKey(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length];
}

function channelId(name: string): string {
  return `channel_${name.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase()}`;
}

export async function buildCorpusSigmaGraph(): Promise<SigmaGraphPayload> {
  const documents = await prisma.document.findMany({
    where: corpusDocumentWhere,
    select: {
      id: true,
      title: true,
      channel: true,
      sourceType: true,
    },
  });

  const entities = await prisma.entity.findMany({
    include: {
      mentions: { select: { documentId: true }, distinct: ["documentId"] },
    },
  });

  const relationships = await prisma.relationship.findMany({
    select: { sourceEntityId: true, targetEntityId: true, relationshipType: true },
  });

  const nodes: SigmaGraphNode[] = [];
  const edges: SigmaGraphEdge[] = [];
  let edgeIdx = 0;

  const byChannel = new Map<string, typeof documents>();
  for (const doc of documents) {
    const ch = doc.channel?.trim() || "Unassigned";
    const list = byChannel.get(ch) ?? [];
    list.push(doc);
    byChannel.set(ch, list);
  }

  const channels = [...byChannel.keys()].sort();
  const channelCount = Math.max(channels.length, 1);

  channels.forEach((ch, ci) => {
    const angle = (2 * Math.PI * ci) / channelCount;
    const cx = Math.cos(angle) * 420;
    const cy = Math.sin(angle) * 320;
    const color = colorForKey(ch);
    const chNodeId = channelId(ch);

    nodes.push({
      id: chNodeId,
      label: ch,
      size: 6.5,
      color,
      x: cx,
      y: cy,
      nodeType: "channel",
      channel: ch,
    });

    const docs = byChannel.get(ch) ?? [];
    docs.forEach((doc, di) => {
      const docNodeId = `doc_${doc.id.replace(/-/g, "")}`;
      const a = (2 * Math.PI * di) / Math.max(docs.length, 1);
      const radius = 62 + Math.min(docs.length, 14) * 3.5;
      nodes.push({
        id: docNodeId,
        label: doc.title ?? "Untitled",
        size: 3.2,
        color,
        x: cx + Math.cos(a) * radius,
        y: cy + Math.sin(a) * radius,
        nodeType: "document",
        channel: ch,
        documentId: doc.id,
        sourceType: doc.sourceType,
      });
      edges.push({
        id: `e${edgeIdx++}`,
        source: chNodeId,
        target: docNodeId,
        label: "in_channel",
      });
    });
  });

  const nodePos = new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));

  for (const entity of entities) {
    const nodeId =
      entity.graphNodeId ?? `entity_${entity.id.replace(/-/g, "")}`;
    const mention = entity.mentions[0];
    const doc = mention
      ? documents.find((d) => d.id === mention.documentId)
      : undefined;
    const ch = doc?.channel?.trim() || "Unassigned";
    const docNodeId = mention
      ? `doc_${mention.documentId.replace(/-/g, "")}`
      : null;
    const anchor = docNodeId ? nodePos.get(docNodeId) : undefined;

    nodes.push({
      id: nodeId,
      label: entity.name,
      size: 2.2,
      color: "#78859B",
      x: (anchor?.x ?? 0) + (Math.random() - 0.5) * 14,
      y: (anchor?.y ?? 0) + (Math.random() - 0.5) * 14,
      nodeType: "entity",
      channel: ch,
    });
    nodePos.set(nodeId, {
      x: nodes[nodes.length - 1].x,
      y: nodes[nodes.length - 1].y,
    });

    for (const m of entity.mentions) {
      const docNodeId = `doc_${m.documentId.replace(/-/g, "")}`;
      if (nodes.some((n) => n.id === docNodeId)) {
        edges.push({
          id: `e${edgeIdx++}`,
          source: nodeId,
          target: docNodeId,
          label: "mentions",
        });
      }
    }
  }

  const entityIdToNode = new Map(
    entities.map((e) => [
      e.id,
      e.graphNodeId ?? `entity_${e.id.replace(/-/g, "")}`,
    ]),
  );

  for (const rel of relationships) {
    const src = entityIdToNode.get(rel.sourceEntityId);
    const tgt = entityIdToNode.get(rel.targetEntityId);
    if (!src || !tgt) continue;
    edges.push({
      id: `e${edgeIdx++}`,
      source: src,
      target: tgt,
      label: rel.relationshipType ?? "related",
    });
  }

  return { nodes, edges, channels };
}

async function buildFromGraphJson(
  target: GraphTarget,
): Promise<SigmaGraphPayload | null> {
  try {
    const raw = JSON.parse(
      await readFile(getGraphJsonPath(target), "utf-8"),
    ) as {
      nodes?: Array<{
        id: string;
        label?: string;
        file_type?: string;
        community?: number;
        x?: number;
        y?: number;
      }>;
      links?: Array<{ source: string; target: string; relation?: string }>;
      edges?: Array<{ source: string; target: string; relation?: string }>;
    };

    const linkList = raw.links ?? raw.edges ?? [];
    if (!raw.nodes?.length) return null;

    const nodes: SigmaGraphNode[] = raw.nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / raw.nodes!.length;
      const community = String(n.community ?? "default");
      return {
        id: n.id,
        label: n.label ?? n.id,
        size: n.file_type === "document" ? 6 : 4,
        color: colorForKey(community),
        x: n.x ?? Math.cos(angle) * 300,
        y: n.y ?? Math.sin(angle) * 300,
        nodeType:
          n.file_type === "document"
            ? "document"
            : n.file_type === "code"
              ? "code"
              : "entity",
        channel: community,
      };
    });

    const edges: SigmaGraphEdge[] = linkList.map((e, i) => ({
      id: `e${i}`,
      source: e.source,
      target: e.target,
      label: e.relation,
    }));

    return { nodes, edges, channels: [] };
  } catch {
    return null;
  }
}

export async function getSigmaGraphData(
  target: GraphTarget,
): Promise<SigmaGraphPayload> {
  if (target === "corpus") {
    const corpus = await buildCorpusSigmaGraph();
    if (corpus.nodes.length > 0) return corpus;
    const fallback = await buildFromGraphJson("corpus");
    return fallback ?? { nodes: [], edges: [], channels: [] };
  }

  const project = await buildFromGraphJson("project");
  return project ?? { nodes: [], edges: [], channels: [] };
}
