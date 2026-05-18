import { prisma } from "../../lib/prisma.js";
import { corpusDocumentWhere } from "./corpusDocuments.js";

export interface GraphExtraction {
  nodes: Array<{
    id: string;
    label: string;
    file_type: string;
    source_file: string;
    source_location: string | null;
    source_url: string | null;
    captured_at: string | null;
    author: string | null;
    contributor: string | null;
  }>;
  edges: Array<{
    source: string;
    target: string;
    relation: string;
    confidence: string;
    confidence_score: number;
    source_file: string;
    source_location: string | null;
    weight: number;
  }>;
  hyperedges: [];
  input_tokens: number;
  output_tokens: number;
}

export async function buildExtractionFromDatabase(): Promise<GraphExtraction> {
  const nodes: GraphExtraction["nodes"] = [];
  const edges: GraphExtraction["edges"] = [];
  const nodeIds = new Set<string>();

  const documents = await prisma.document.findMany({
    where: corpusDocumentWhere,
    select: {
      id: true,
      title: true,
      sourceType: true,
      ingestedAt: true,
      channel: true,
    },
  });

  const channelNames = new Set<string>();

  for (const doc of documents) {
    const ch = doc.channel?.trim() || "Unassigned";
    channelNames.add(ch);
    const docNodeId = `doc_${doc.id.replace(/-/g, "")}`;
    if (!nodeIds.has(docNodeId)) {
      nodeIds.add(docNodeId);
      nodes.push({
        id: docNodeId,
        label: doc.title ?? doc.channel ?? "Untitled",
        file_type: "document",
        source_file: `${doc.id}.md`,
        source_location: ch,
        source_url: null,
        captured_at: doc.ingestedAt.toISOString(),
        author: null,
        contributor: ch,
      });
    }
  }

  for (const ch of channelNames) {
    const chNodeId = `channel_${ch.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase()}`;
    if (!nodeIds.has(chNodeId)) {
      nodeIds.add(chNodeId);
      nodes.push({
        id: chNodeId,
        label: ch,
        file_type: "document",
        source_file: "corpus",
        source_location: null,
        source_url: null,
        captured_at: null,
        author: null,
        contributor: null,
      });
    }
    for (const doc of documents) {
      const docCh = doc.channel?.trim() || "Unassigned";
      if (docCh !== ch) continue;
      const docNodeId = `doc_${doc.id.replace(/-/g, "")}`;
      edges.push({
        source: chNodeId,
        target: docNodeId,
        relation: "in_channel",
        confidence: "EXTRACTED",
        confidence_score: 1.0,
        source_file: `${doc.id}.md`,
        source_location: null,
        weight: 1.0,
      });
    }
  }

  const entities = await prisma.entity.findMany({
    include: {
      mentions: {
        take: 1,
        select: { documentId: true },
      },
    },
  });

  for (const entity of entities) {
    const nodeId =
      entity.graphNodeId ?? `entity_${entity.id.replace(/-/g, "")}`;
    if (!nodeIds.has(nodeId)) {
      nodeIds.add(nodeId);
      nodes.push({
        id: nodeId,
        label: entity.name,
        file_type: "document",
        source_file: entity.mentions[0]
          ? `${entity.mentions[0].documentId}.md`
          : "corpus",
        source_location: null,
        source_url: null,
        captured_at: null,
        author: null,
        contributor: null,
      });
    }

    const mentionDocs = await prisma.entityMention.findMany({
      where: { entityId: entity.id },
      select: { documentId: true },
      distinct: ["documentId"],
    });

    for (const m of mentionDocs) {
      const docNodeId = `doc_${m.documentId.replace(/-/g, "")}`;
      if (!nodeIds.has(docNodeId)) continue;
      edges.push({
        source: nodeId,
        target: docNodeId,
        relation: "mentioned_in",
        confidence: "EXTRACTED",
        confidence_score: 1.0,
        source_file: `${m.documentId}.md`,
        source_location: null,
        weight: 1.0,
      });
    }
  }

  const relationships = await prisma.relationship.findMany({
    include: {
      sourceEntity: { select: { graphNodeId: true, id: true } },
      targetEntity: { select: { graphNodeId: true, id: true } },
    },
  });

  for (const rel of relationships) {
    const src =
      rel.sourceEntity.graphNodeId ??
      `entity_${rel.sourceEntity.id.replace(/-/g, "")}`;
    const tgt =
      rel.targetEntity.graphNodeId ??
      `entity_${rel.targetEntity.id.replace(/-/g, "")}`;
    if (!nodeIds.has(src) || !nodeIds.has(tgt)) continue;
    edges.push({
      source: src,
      target: tgt,
      relation: rel.relationshipType ?? "related_to",
      confidence: "INFERRED",
      confidence_score: rel.confidence,
      source_file: "postgres",
      source_location: null,
      weight: rel.confidence,
    });
  }

  const docIds = documents.map((d) => d.id);
  if (docIds.length > 1) {
    const mentionCounts = await prisma.entityMention.groupBy({
      by: ["entityId"],
      where: { documentId: { in: docIds } },
      _count: { documentId: true },
    });
    const coMentions = mentionCounts.filter((m) => m._count.documentId >= 2);

    for (const row of coMentions) {
      const docsForEntity = await prisma.entityMention.findMany({
        where: { entityId: row.entityId, documentId: { in: docIds } },
        select: { documentId: true },
        distinct: ["documentId"],
      });
      const entity = await prisma.entity.findUnique({
        where: { id: row.entityId },
        select: { graphNodeId: true, id: true, name: true },
      });
      if (!entity) continue;
      const entityNodeId =
        entity.graphNodeId ?? `entity_${entity.id.replace(/-/g, "")}`;

      for (let i = 0; i < docsForEntity.length; i++) {
        for (let j = i + 1; j < docsForEntity.length; j++) {
          const a = `doc_${docsForEntity[i].documentId.replace(/-/g, "")}`;
          const b = `doc_${docsForEntity[j].documentId.replace(/-/g, "")}`;
          if (!nodeIds.has(a) || !nodeIds.has(b)) continue;
          edges.push({
            source: a,
            target: b,
            relation: "co_mentions",
            confidence: "INFERRED",
            confidence_score: 0.7,
            source_file: entityNodeId,
            source_location: entity.name,
            weight: 0.7,
          });
        }
      }
    }
  }

  return {
    nodes,
    edges,
    hyperedges: [],
    input_tokens: 0,
    output_tokens: 0,
  };
}
