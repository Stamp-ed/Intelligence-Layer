import type { Prisma } from "@stamped/database";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

export async function listEntities(query: {
  page?: number;
  page_size?: number;
  entity_type?: string;
  search?: string;
}) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.page_size ?? 50));
  const skip = (page - 1) * pageSize;

  const where: Prisma.EntityWhereInput = {};
  if (query.entity_type) where.entityType = query.entity_type;
  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }

  const [entities, total] = await Promise.all([
    prisma.entity.findMany({
      where,
      orderBy: { mentionCount: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.entity.count({ where }),
  ]);

  return {
    entities: entities.map((e) => ({
      id: e.id,
      name: e.name,
      entity_type: e.entityType,
      description: e.description ?? "",
      mention_count: e.mentionCount,
      graph_node_id: e.graphNodeId,
      aliases: e.aliases,
    })),
    total,
    page,
    page_size: pageSize,
  };
}

export async function getEntityById(id: string) {
  const entity = await prisma.entity.findUnique({
    where: { id },
    include: {
      mentions: {
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          document: {
            select: { id: true, title: true, channel: true, sourceType: true },
          },
        },
      },
      relationshipsFrom: {
        include: {
          targetEntity: { select: { id: true, name: true, entityType: true } },
        },
      },
      relationshipsTo: {
        include: {
          sourceEntity: { select: { id: true, name: true, entityType: true } },
        },
      },
    },
  });

  if (!entity) {
    throw new AppError(404, "not_found", "Entity not found");
  }

  return {
    id: entity.id,
    name: entity.name,
    entity_type: entity.entityType,
    description: entity.description ?? "",
    mention_count: entity.mentionCount,
    graph_node_id: entity.graphNodeId,
    aliases: entity.aliases,
    mentions: entity.mentions.map((m) => ({
      document_id: m.documentId,
      chunk_id: m.chunkId,
      title: m.document.title ?? "Untitled",
      channel: m.document.channel,
      source_type: m.document.sourceType,
      excerpt: m.contextSnippet ?? "",
    })),
    related_entities: [
      ...entity.relationshipsFrom.map((r) => ({
        id: r.targetEntity.id,
        name: r.targetEntity.name,
        entity_type: r.targetEntity.entityType,
        relationship_type: r.relationshipType,
        direction: "outgoing" as const,
      })),
      ...entity.relationshipsTo.map((r) => ({
        id: r.sourceEntity.id,
        name: r.sourceEntity.name,
        entity_type: r.sourceEntity.entityType,
        relationship_type: r.relationshipType,
        direction: "incoming" as const,
      })),
    ],
  };
}

export async function searchEntities(q: string, limit = 20) {
  const entities = await prisma.entity.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    orderBy: { mentionCount: "desc" },
    take: limit,
  });
  return entities.map((e) => ({
    id: e.id,
    name: e.name,
    entity_type: e.entityType,
    mention_count: e.mentionCount,
  }));
}
