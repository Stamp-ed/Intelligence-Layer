import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))

from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json

extraction = json.loads((root / ".graphify_extract.json").read_text())
detection = json.loads((root / ".graphify_detect.json").read_text())

out_dir = root / "graphify-out"
out_dir.mkdir(parents=True, exist_ok=True)

G = build_from_json(extraction)
communities = cluster(G)
cohesion = score_all(G, communities)
tokens = {
    "input": extraction.get("input_tokens", 0),
    "output": extraction.get("output_tokens", 0),
}
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
labels = {cid: f"Community {cid}" for cid in communities}
questions = suggest_questions(G, communities, labels)

report = generate(
    G,
    communities,
    cohesion,
    labels,
    gods,
    surprises,
    detection,
    tokens,
    str(root),
    suggested_questions=questions,
)
(root / "graphify-out" / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")
to_json(G, communities, str(out_dir / "graph.json"))

analysis = {
    "communities": {str(k): v for k, v in communities.items()},
    "cohesion": {str(k): v for k, v in cohesion.items()},
    "gods": gods,
    "surprises": surprises,
    "questions": questions,
}
(root / ".graphify_analysis.json").write_text(
    json.dumps(analysis, indent=2), encoding="utf-8"
)

if G.number_of_nodes() == 0:
    print("ERROR: Graph is empty")
    sys.exit(1)

print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities")
