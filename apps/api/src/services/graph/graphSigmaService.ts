import { prisma } from "../../lib/prisma.js";
import { corpusDocumentWhere } from "./corpusDocuments.js";

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
    if (!byChannel.has(ch)) byChannel.set(ch, []);
    byChannel.get(ch)!.push(doc);
  }

  const channels = [...byChannel.keys()].sort();
  const nodePos = new Map<string, { x: number; y: number }>();

  let channelRing = 0;
  for (const ch of channels) {
    const cid = channelId(ch);
    const angle = (2 * Math.PI * channelRing) / Math.max(channels.length, 1);
    const cx = Math.cos(angle) * 220;
    const cy = Math.sin(angle) * 220;
    channelRing++;

    nodes.push({
      id: cid,
      label: ch,
      size: 10,
      color: colorForKey(ch),
      x: cx,
      y: cy,
      nodeType: "channel",
      channel: ch,
    });
    nodePos.set(cid, { x: cx, y: cy });

    const docs = byChannel.get(ch) ?? [];
    docs.forEach((doc, i) => {
      const docNodeId = `doc_${doc.id.replace(/-/g, "")}`;
      const docAngle = (2 * Math.PI * i) / Math.max(docs.length, 1);
      const dx = cx + Math.cos(docAngle) * 90;
      const dy = cy + Math.sin(docAngle) * 90;

      nodes.push({
        id: docNodeId,
        label: doc.title ?? "Untitled",
        size: 6,
        color: colorForKey(ch),
        x: dx,
        y: dy,
        nodeType: "document",
        channel: ch,
        documentId: doc.id,
        sourceType: doc.sourceType,
      });
      nodePos.set(docNodeId, { x: dx, y: dy });

      edges.push({
        id: `e${edgeIdx++}`,
        source: cid,
        target: docNodeId,
        label: "channel",
      });
    });
  }

  for (const entity of entities) {
    const nodeId = entity.graphNodeId ?? `entity_${entity.id.replace(/-/g, "")}`;
    const mentionDocs = entity.mentions.map((m) => m.documentId);
    const firstDoc = documents.find((d) => mentionDocs.includes(d.id));
    const ch = firstDoc?.channel?.trim() || "Unassigned";
    const anchor = nodePos.get(channelId(ch));

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

export async function getSigmaGraphData(): Promise<SigmaGraphPayload> {
  return buildCorpusSigmaGraph();
}
