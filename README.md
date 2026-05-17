# Stamped Intelligence System

Internal AI-powered organizational knowledge and retrieval platform for the Stamped team.

## Stack

- **API:** Express + TypeScript
- **ORM:** Prisma (PostgreSQL / Supabase)
- **Vectors:** Qdrant
- **AI:** OpenAI embeddings + chat

> **V1 note:** Memgraph (knowledge graph) is deferred to Phase 3. V1 uses Postgres + Qdrant only.
- **Web:** Next.js 14 App Router + Tailwind

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop
- OpenAI API key

## Quick start

1. Copy environment file:

```bash
cp .env.example .env
# Edit .env and set OPENAI_API_KEY
```

2. Install dependencies:

```bash
pnpm install
pnpm db:generate
```

3. Start Qdrant (vectors). Postgres can be Supabase or local Docker:

```bash
docker compose up qdrant -d
```

4. Run migrations:

```bash
pnpm db:migrate:deploy
```

5. Start API and web (from repo root):

```bash
pnpm dev
```

- API: http://localhost:8000
- Web: http://localhost:3000

## Docker (full stack)

```bash
docker compose up --build
```

## API endpoints (Phase 1)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/ingest/text` | Ingest raw text |
| POST | `/api/v1/ingest/file` | Upload `.txt` or `.md` |
| POST | `/api/v1/query` | Natural language query |
| GET | `/api/v1/admin/health` | Service health |
| GET | `/api/v1/admin/stats` | Document/chunk counts |

## Project structure

```
apps/api/          Express API
apps/web/          Next.js UI
packages/database/ Prisma schema + client
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run API + web in parallel |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Create/apply dev migrations |
| `pnpm db:migrate:deploy` | Apply migrations (production) |
