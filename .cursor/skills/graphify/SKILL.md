# Graphify — Stamped Intelligence (dual graphs)

Two separate graphs — never mix them:

| Graph | Input path | Output dir | Cursor command |
|-------|------------|------------|----------------|
| **Project** | Codebase (`apps/`, `packages/`, `scripts/`, README, spec) | `graphify-out/project/` | `/graphify .` or rebuild Project in UI |
| **Corpus** | Ingested documents | `data/corpus/` → `graphify-out/corpus/` | `/graphify data/corpus` or rebuild Uploaded knowledge in UI |

## Corpus graph (uploaded knowledge)

Export corpus files manually to `data/corpus/` (one `.md` per document with YAML frontmatter) or use your own export script. The product API does not run Graphify.

```
/graphify data/corpus
/graphify data/corpus --update
```

## Project graph (this repo)

```
/graphify .
```

Scans `apps/`, `packages/`, `scripts/`, `README.md`, `stamped_intelligence_system_cursor_prompt.md` — excludes `data/corpus/` and `graphify-out/`.

## Outputs (per graph)

Under `graphify-out/project/` or `graphify-out/corpus/`:

- `graph.html` — `/graph` page (tab: Project vs Uploaded knowledge)
- `graph.json` — retrieval + agent queries (corpus graph used for query expansion)
- `GRAPH_REPORT.md`

## Agent queries (after build)

Use the graph that matches the question:

```
/graphify query "How does ingestion connect to Qdrant?"   # project graph cwd
/graphify query "What do we know about FRISS?"             # run from corpus graph or query corpus graph.json
```

## Requirements

- Python 3.10+ (`py -3` on Windows)
- `pip install graphifyy`
- Set `PYTHON_PATH=py` in `.env.local` for API rebuilds
