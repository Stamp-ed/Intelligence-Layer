import { openai } from "../../lib/openai.js";
import { chatTokenLimitParam } from "../../lib/openaiChat.js";
import { getModelSettings } from "../admin/modelSettingsService.js";
import { prisma } from "../../lib/prisma.js";

const ENTITY_TYPES = new Set([
  "insurer",
  "competitor",
  "product_module",
  "fraud_type",
  "regulation",
  "market_concept",
  "person",
  "geography",
  "metric",
  "technology",
]);

export interface ExtractedEntity {
  name: string;
  type: string;
  description: string;
  aliases: string[];
}

const EXTRACTION_PROMPT = `You are an entity extractor for Stamped, an AI-powered insurance fraud prevention company operating in the Indian insurance market.

Extract all significant entities from the provided text. For each entity, identify:
- name: The entity name as it appears
- type: One of: insurer, competitor, product_module, fraud_type, regulation, market_concept, person, geography, metric, technology
- description: Brief description based on context
- aliases: Any alternative names or abbreviations used

Respond ONLY with a JSON array of entity objects. No preamble.`;

function toGraphNodeId(entityId: string): string {
  return `entity_${entityId.replace(/-/g, "")}`;
}

export async function extractEntitiesFromText(
  text: string,
): Promise<ExtractedEntity[]> {
  const settings = await getModelSettings();
  const completion = await openai.chat.completions.create({
    model: settings.standard_model,
    ...chatTokenLimitParam(settings.standard_model, 1500),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: EXTRACTION_PROMPT },
      {
        role: "user",
        content: `Return JSON as {"entities":[...]}\n\nText:\n${text.slice(0, 6000)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? '{"entities":[]}';
  try {
    const parsed = JSON.parse(raw) as
      | ExtractedEntity[]
      | { entities?: ExtractedEntity[] };
    const list = Array.isArray(parsed)
      ? parsed
      : (parsed.entities ?? []);
    return list
      .filter((e) => e?.name && e?.type)
      .map((e) => ({
        name: e.name.trim(),
        type: ENTITY_TYPES.has(e.type) ? e.type : "market_concept",
        description: e.description?.trim() ?? "",
        aliases: Array.isArray(e.aliases)
          ? e.aliases.map((a) => String(a).trim()).filter(Boolean)
          : [],
      }));
  } catch {
    return [];
  }
}

async function upsertEntity(
  extracted: ExtractedEntity,
): Promise<string> {
  const existing = await prisma.entity.findFirst({
    where: {
      name: { equals: extracted.name, mode: "insensitive" },
      entityType: extracted.type,
    },
  });

  if (existing) {
    const aliases = [
      ...new Set([...existing.aliases, ...extracted.aliases]),
    ];
    const updated = await prisma.entity.update({
      where: { id: existing.id },
      data: {
        mentionCount: { increment: 1 },
        lastSeenAt: new Date(),
        description: existing.description || extracted.description || undefined,
        aliases,
        graphNodeId: existing.graphNodeId ?? toGraphNodeId(existing.id),
      },
    });
    return updated.id;
  }

  const created = await prisma.entity.create({
    data: {
      name: extracted.name,
      entityType: extracted.type,
      description: extracted.description || null,
      aliases: extracted.aliases,
      mentionCount: 1,
    },
  });

  await prisma.entity.update({
    where: { id: created.id },
    data: { graphNodeId: toGraphNodeId(created.id) },
  });

  return created.id;
}

export async function extractEntitiesForDocument(
  documentId: string,
): Promise<number> {
  const chunks = await prisma.chunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: "asc" },
    select: { id: true, chunkText: true },
  });

  if (chunks.length === 0) return 0;

  let mentionCount = 0;
  const entityIdsInChunk: string[][] = [];

  for (const chunk of chunks) {
    const extracted = await extractEntitiesFromText(chunk.chunkText);
    const chunkEntityIds: string[] = [];

    for (const ent of extracted) {
      const entityId = await upsertEntity(ent);
      chunkEntityIds.push(entityId);

      const snippet =
        chunk.chunkText.length > 300
          ? chunk.chunkText.slice(0, 300) + "…"
          : chunk.chunkText;

      const existingMention = await prisma.entityMention.findFirst({
        where: { entityId, chunkId: chunk.id },
      });
      if (!existingMention) {
        await prisma.entityMention.create({
          data: {
            entityId,
            chunkId: chunk.id,
            documentId,
            contextSnippet: snippet,
            confidence: 1.0,
          },
        });
      }
      mentionCount++;
    }
    entityIdsInChunk.push(chunkEntityIds);
  }

  const { syncCoOccurrenceRelationships } = await import(
    "./relationshipService.js"
  );
  await syncCoOccurrenceRelationships(entityIdsInChunk);

  return mentionCount;
}
