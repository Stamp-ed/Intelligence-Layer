import json
from pathlib import Path
from graphify.cache import save_semantic_cache

root = Path(__file__).resolve().parents[1]

cached = {"nodes": [], "edges": [], "hyperedges": []}
cached_path = root / ".graphify_cached.json"
if cached_path.exists():
    cached = json.loads(cached_path.read_text())

chunk_path = root / "graphify-out" / ".graphify_chunk_01.json"
new = {"nodes": [], "edges": [], "hyperedges": []}
if chunk_path.exists():
    new = json.loads(chunk_path.read_text(encoding="utf-8"))
    save_semantic_cache(
        new.get("nodes", []), new.get("edges", []), new.get("hyperedges", [])
    )

all_nodes = cached["nodes"] + new.get("nodes", [])
all_edges = cached["edges"] + new.get("edges", [])
all_hyperedges = cached.get("hyperedges", []) + new.get("hyperedges", [])
seen = set()
deduped = []
for n in all_nodes:
    if n["id"] not in seen:
        seen.add(n["id"])
        deduped.append(n)

merged = {
    "nodes": deduped,
    "edges": all_edges,
    "hyperedges": all_hyperedges,
    "input_tokens": new.get("input_tokens", 0),
    "output_tokens": new.get("output_tokens", 0),
}
(root / ".graphify_semantic.json").write_text(json.dumps(merged, indent=2))
print(
    f"Semantic: {len(deduped)} nodes, {len(all_edges)} edges "
    f"({len(cached['nodes'])} cached, {len(new.get('nodes', []))} new)"
)

ast = json.loads((root / ".graphify_ast.json").read_text())
sem = merged
seen_ast = {n["id"] for n in ast["nodes"]}
merged_nodes = list(ast["nodes"])
for n in sem["nodes"]:
    if n["id"] not in seen_ast:
        merged_nodes.append(n)
        seen_ast.add(n["id"])

final = {
    "nodes": merged_nodes,
    "edges": ast["edges"] + sem["edges"],
    "hyperedges": sem.get("hyperedges", []),
    "input_tokens": sem.get("input_tokens", 0),
    "output_tokens": sem.get("output_tokens", 0),
}
(root / ".graphify_extract.json").write_text(json.dumps(final, indent=2))
print(
    f"Merged: {len(merged_nodes)} nodes, {len(final['edges'])} edges "
    f"({len(ast['nodes'])} AST + {len(sem['nodes'])} semantic)"
)
