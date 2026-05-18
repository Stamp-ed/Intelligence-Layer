import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

const HISTORY_LIMIT = 10;

export async function getOrCreateConversation(conversationId?: string) {
  if (conversationId) {
    const existing = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: HISTORY_LIMIT },
      },
    });
    if (!existing) {
      throw new AppError(404, "not_found", "Conversation not found");
    }
    return existing;
  }

  return prisma.conversation.create({
    data: { sessionId: crypto.randomUUID(), metadata: {} },
    include: { messages: true },
  });
}

export async function listConversations(limit = 30) {
  const rows = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      messages: {
        where: { role: "user" },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    session_id: c.sessionId,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
    preview: c.messages[0]?.content?.slice(0, 120) ?? "",
  }));
}

export async function getConversation(id: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) {
    throw new AppError(404, "not_found", "Conversation not found");
  }

  const allChunkIds = conversation.messages.flatMap((m) => m.retrievedChunkIds);
  const chunks =
    allChunkIds.length > 0
      ? await prisma.chunk.findMany({
          where: { id: { in: allChunkIds } },
          include: {
            document: {
              select: {
                id: true,
                title: true,
                sourceType: true,
                channel: true,
                author: true,
                url: true,
              },
            },
          },
        })
      : [];
  const chunkMap = new Map(chunks.map((c) => [c.id, c]));

  return {
    id: conversation.id,
    session_id: conversation.sessionId,
    created_at: conversation.createdAt.toISOString(),
    updated_at: conversation.updatedAt.toISOString(),
    messages: conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      model_used: m.modelUsed,
      created_at: m.createdAt.toISOString(),
      retrieved_chunk_ids: m.retrievedChunkIds,
      sources:
        m.role === "assistant"
          ? m.retrievedChunkIds
              .map((chunkId) => {
                const chunk = chunkMap.get(chunkId);
                if (!chunk) return null;
                const text = chunk.chunkText;
                return {
                  document_id: chunk.documentId,
                  chunk_id: chunk.id,
                  title: chunk.document.title ?? "Untitled",
                  source_type: chunk.document.sourceType,
                  channel: chunk.document.channel,
                  author: chunk.document.author,
                  excerpt: text.length > 400 ? `${text.slice(0, 400)}…` : text,
                  relevance_score: 0,
                  url: chunk.document.url,
                };
              })
              .filter((s): s is NonNullable<typeof s> => s !== null)
          : [],
    })),
  };
}

export async function deleteConversation(id: string): Promise<void> {
  const existing = await prisma.conversation.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, "not_found", "Conversation not found");
  }
  await prisma.conversation.delete({ where: { id } });
}

export function formatHistoryForPrompt(
  messages: Array<{ role: string; content: string }>,
): Array<{ role: "user" | "assistant"; content: string }> {
  return [...messages]
    .reverse()
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}
