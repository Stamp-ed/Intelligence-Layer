-- AlterTable
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "graph_node_id" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "entities_name_type_key" ON "entities" (LOWER("name"), "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "entity_mentions_entity_id_chunk_id_key" ON "entity_mentions" ("entity_id", "chunk_id");
