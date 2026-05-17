import { openai } from "../../lib/openai.js";
import { config } from "../../config.js";
import { prisma } from "../../lib/prisma.js";
import { semanticSearch } from "../retrieval/semanticSearch.js";
import { assembleContext } from "../retrieval/contextAssembler.js";
import type { QueryRequest } from "../../schemas/query.js";

const SYSTEM_PROMPT = `You are the Stamped Intelligence System — an internal AI assistant with access to Stamped's complete organizational knowledge base.

Stamped is an AI-powered insurance fraud prevention and operational efficiency platform built for the Indian general insurance market. You understand insurance fraud, the Indian insurance ecosystem, Stamped's product architecture, competitive landscape, and strategic context deeply.

Your job is to answer questions from the Stamped team using ONLY the retrieved context provided. Never hallucinate or invent information not present in the context.

Rules:
1. Answer directly and precisely. Lead with the answer, support with evidence.
2. Always cite your sources by referencing the document title and channel.
3. If the context doesn't contain sufficient information, say so explicitly.
4. For strategic questions, synthesize across multiple sources and note any contradictions.
5. Use Stamped's domain vocabulary naturally (loss ratio, entity graph, capture envelope, etc.)
6. Format responses with clear structure: direct answer → supporting evidence → caveats if any.
7. Never make up competitor data, market figures, or strategic claims not present in the context.

Retrieved context will be provided in the user message. Conversation history is provided for multi-turn context.`;

export interface SourceCitation {
  document_id: string;
  chunk_id: string;
  title: string;
  source_type: string;
  channel: string | null;
  author: string | null;
  excerpt: string;
  relevance_score: number;
  url: string | null;
}

export interface QueryResponse {
  answer: string;
  sources: SourceCitation[];
  conversation_id: string;
  model_used: string;
  retrieval_metadata: {
    chunks_retrieved: number;
    top_score: number;
  };
}

export async function retrieveAndAnswer(
  request: QueryRequest,
): Promise<QueryResponse> {
  const model =
    request.synthesis_level === "strategic"
      ? config.strategicModel
      : config.standardModel;

  const searchResults = await semanticSearch(
    request.query,
    20,
    request.filters,
  );

  const topChunks = searchResults.slice(0, 8);
  const context = assembleContext(topChunks);

  const userMessage = `Retrieved context:\n\n${context || "(No relevant context found)"}\n\n---\n\nUser question: ${request.query}`;

  const completion = await openai.chat.completions.create({
    model,
    max_tokens: config.maxTokensAnswer,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const answer =
    completion.choices[0]?.message?.content ??
    "Unable to generate a response.";

  const docIds = [...new Set(topChunks.map((c) => c.documentId))];
  const documents = await prisma.document.findMany({
    where: { id: { in: docIds } },
    select: { id: true, url: true, author: true },
  });
  const docMap = new Map(documents.map((d) => [d.id, d]));

  const sources: SourceCitation[] = topChunks
    .slice(0, request.max_sources)
    .map((c) => {
      const doc = docMap.get(c.documentId);
      return {
        document_id: c.documentId,
        chunk_id: c.chunkId,
        title: c.title,
        source_type: c.sourceType,
        channel: c.channel || null,
        author: c.author || doc?.author || null,
        excerpt:
          c.chunkText.length > 400
            ? c.chunkText.slice(0, 400) + "…"
            : c.chunkText,
        relevance_score: c.score,
        url: doc?.url ?? null,
      };
    });

  const sessionId = crypto.randomUUID();
  const conversation = await prisma.conversation.create({
    data: { sessionId, metadata: {} },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: "user",
        content: request.query,
        retrievedChunkIds: [],
        retrievedDocumentIds: [],
      },
      {
        conversationId: conversation.id,
        role: "assistant",
        content: answer,
        retrievedChunkIds: topChunks.map((c) => c.chunkId),
        retrievedDocumentIds: docIds,
        modelUsed: model,
      },
    ],
  });

  return {
    answer,
    sources,
    conversation_id: conversation.id,
    model_used: model,
    retrieval_metadata: {
      chunks_retrieved: topChunks.length,
      top_score: topChunks[0]?.score ?? 0,
    },
  };
}
