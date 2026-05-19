-- CreateTable
CREATE TABLE "system_config" (
    "id" VARCHAR(32) NOT NULL,
    "standard_model" VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
    "strategic_model" VARCHAR(100) NOT NULL DEFAULT 'gpt-4o',
    "embedding_model" VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

INSERT INTO "system_config" ("id", "standard_model", "strategic_model", "embedding_model", "updated_at")
VALUES ('default', 'gpt-4o-mini', 'gpt-4o', 'text-embedding-3-small', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
