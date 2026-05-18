# Stamped Intelligence System

Internal AI-powered organizational knowledge and retrieval platform for the Stamped team.

## Stack

- **API:** Express + TypeScript
- **ORM:** Prisma (PostgreSQL / Supabase)
- **Vectors:** Qdrant
- **AI:** OpenAI embeddings + chat
- **Web:** Next.js 14 App Router + Tailwind

> **Knowledge graph:** [Graphify](https://pypi.org/project/graphifyy/) file artifacts (`graphify-out/`) — no graph database container. Structured entities live in Postgres.

## Prerequisites

- Node.js 20+
- pnpm 9+ (or `npx pnpm@9.15.0` if pnpm is not on PATH)
- Docker Desktop (for Qdrant only)
- OpenAI API key
- Supabase project (or local Postgres via Docker)

---

## How to run (local development)

### 1. Environment

Copy the example file and configure secrets in **`.env.local`** (gitignored):

```powershell
copy .env.example .env.local
```

Required in `.env.local`:

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Embeddings + chat |
| `DATABASE_URL` | Supabase pooled URL (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase direct URL (port 5432) for migrations |
| `QDRANT_HOST` | `localhost` |
| `QDRANT_PORT` | `6333` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |

Optional:

| Variable | Purpose |
|----------|---------|
| `INGEST_BATCH_ROOTS` | Comma-separated folders allowed for batch ingest (e.g. `D:\Startups\Stamped\docs`) |

### 2. Install dependencies

```powershell
cd D:\Startups\Stamped\Intelligence-Layer
npx pnpm@9.15.0 install
npx pnpm@9.15.0 db:generate
```

### 3. Database migrations (Supabase)

```powershell
npx pnpm@9.15.0 db:migrate:deploy
```

### 4. Start Qdrant

Start **Docker Desktop**, then:

```powershell
docker compose up qdrant -d
```

Verify: http://localhost:6333/dashboard

### 5. Run API + web

```powershell
npx pnpm@9.15.0 dev
```

| Service | URL |
|---------|-----|
| Web UI | http://localhost:3000 |
| API | http://localhost:8000 |
| API health | http://localhost:8000/api/v1/admin/health |

---

## Using the app

1. **Ingest** — http://localhost:3000/ingest  
   - Paste text, upload `.txt` / `.md` / `.pdf` / `.docx`, or Discord Chat Exporter `.json`  
   - Batch folder scan (API server path; set `INGEST_BATCH_ROOTS`)

2. **Query** — http://localhost:3000/query  
   - Ask questions; answers include source citations

3. **Documents** — http://localhost:3000/documents  
   - Browse, filter, sort, view chunks, delete documents

4. **Entities** — http://localhost:3000/entities  
   - Browse extracted insurers, competitors, regulations, etc.

5. **Knowledge Graph** — http://localhost:3000/graph  
   - **Project** tab — how this app is built (`graphify-out/project/`)  
   - **Uploaded knowledge** tab — ingested documents (`graphify-out/corpus/`)  
   - Rebuild each tab independently after changes

6. **Admin** — http://localhost:3000/admin  
   - Postgres, Qdrant, graph, and OpenAI health + stats

### Graphify (Cursor agent)

For a richer semantic graph (cross-document surprises, full report):

```text
/graphify data/corpus
```

Requires Python 3.10+ and `pip install graphifyy`. Optional: set `GRAPH_EXPANSION_ENABLED=true` in `.env.local` for graph-assisted query retrieval.

---

## API endpoints (Phase 1–3)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/ingest/text` | Ingest raw text |
| POST | `/api/v1/ingest/file` | Upload `.txt`, `.md`, `.pdf`, `.docx` |
| POST | `/api/v1/ingest/discord` | Discord Chat Exporter JSON |
| POST | `/api/v1/ingest/batch` | Scan folder `{ "folder_path": "..." }` |
| GET | `/api/v1/ingest/jobs` | List ingestion jobs |
| POST | `/api/v1/query` | Natural language query |
| GET | `/api/v1/documents` | List documents (paginated, filterable) |
| GET | `/api/v1/documents/:id` | Document detail + chunks |
| PATCH | `/api/v1/documents/:id` | Update metadata |
| DELETE | `/api/v1/documents/:id` | Delete document + Qdrant vectors |
| GET | `/api/v1/entities` | List entities |
| GET | `/api/v1/entities/:id` | Entity detail |
| GET | `/api/v1/graph/status` | Graph build status |
| POST | `/api/v1/graph/rebuild` | Rebuild graph (async job) |
| GET | `/api/v1/graph/view` | Graph HTML (iframe) |
| GET | `/api/v1/graph/insights` | Report insights JSON |
| GET | `/api/v1/admin/health` | Service health |
| GET | `/api/v1/admin/stats` | Counts |

---

## Project structure

```
apps/api/              Express API
apps/web/              Next.js UI
apps/discord-bot/      Discord ingest bot (poll + slash commands)
packages/database/     Prisma schema + migrations
```

### Discord ingest bot

1. Add bot env vars to `.env.local` (see `.env.example` — `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, etc.).
2. In [Discord Developer Portal](https://discord.com/developers/applications) → your app → **Bot** → **Privileged Gateway Intents**: turn **ON** **Message Content Intent**. (Required for backfill/poll to see message text and file attachments in history.)
3. Register slash commands (guild-scoped in dev):

```powershell
npx pnpm@9.15.0 discord:register
```

4. Run API + bot (use **two terminals**, or `pnpm dev` for API + web + bot):

```powershell
# Terminal 1
npx pnpm@9.15.0 dev:api

# Terminal 2 — must be running or slash commands will not respond
npx pnpm@9.15.0 dev:bot
```

Confirm you see `[discord-bot] Logged in as Stamped-Bot#…` before using slash commands.

5. In a server channel: `/ingest-on` → content syncs on poll (default every 6h) or live if enabled. Use `/ingest-backfill-all` for history.

**Security:** Never commit `DISCORD_BOT_TOKEN`. If exposed, rotate in the Developer Portal.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run API + web in parallel |
| `pnpm dev:api` | API only |
| `pnpm dev:web` | Web only |
| `pnpm dev:bot` | Discord bot only |
| `pnpm discord:register` | Register slash commands |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate:deploy` | Apply migrations to Supabase |

---

## Troubleshooting

**`dockerDesktopLinuxEngine` not found** — Docker Desktop is not running. Start it, then `docker compose up qdrant -d`.

**Qdrant unhealthy in admin** — Run `docker compose ps` and ensure port 6333 is up.

**Prisma migrate fails** — Check `DIRECT_URL` in `.env.local` (port 5432, not 6543).

**Ingest produces no chunks** — Content must be long enough to form chunks ≥100 tokens after chunking.

**Batch ingest path rejected** — Add the folder to `INGEST_BATCH_ROOTS` in `.env.local` and restart the API.
