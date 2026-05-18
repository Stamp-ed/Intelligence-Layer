import { prisma } from "../../lib/prisma.js";

export async function syncCoOccurrenceRelationships(
  entityIdsPerChunk: string[][],
): Promise<void> {
  for (const ids of entityIdsPerChunk) {
    const unique = [...new Set(ids)];
    if (unique.length < 2) continue;

    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const [a, b] =
          unique[i]! < unique[j]!
            ? [unique[i]!, unique[j]!]
            : [unique[j]!, unique[i]!];

        const existing = await prisma.relationship.findFirst({
          where: {
            sourceEntityId: a,
            targetEntityId: b,
            relationshipType: "MENTIONED_ALONGSIDE",
          },
        });

        if (existing) {
          await prisma.relationship.update({
            where: { id: existing.id },
            data: { confidence: Math.min(1, existing.confidence + 0.05) },
          });
        } else {
          await prisma.relationship.create({
            data: {
              sourceEntityId: a,
              targetEntityId: b,
              relationshipType: "MENTIONED_ALONGSIDE",
              confidence: 0.7,
            },
          });
        }
      }
    }
  }
}
