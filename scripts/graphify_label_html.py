import json
from pathlib import Path

from graphify.build import build_from_json
from graphify.cluster import score_all
from graphify.analyze import suggest_questions
from graphify.report import generate
from graphify.export import to_html

root = Path(__file__).resolve().parents[1]

extraction = json.loads((root / ".graphify_extract.json").read_text(encoding="utf-8"))
detection = json.loads((root / ".graphify_detect.json").read_text(encoding="utf-8"))
analysis = json.loads((root / ".graphify_analysis.json").read_text(encoding="utf-8"))

G = build_from_json(extraction)
communities = {int(k): v for k, v in analysis["communities"].items()}
cohesion = {int(k): v for k, v in analysis["cohesion"].items()}
tokens = {
    "input": extraction.get("input_tokens", 0),
    "output": extraction.get("output_tokens", 0),
}

labels = {
    0: "API Core & Entities",
    1: "Architecture & Graphify Spec",
    2: "Web UI & API Client",
    3: "Ingestion Parsers",
    4: "Chunking & Embeddings",
    5: "Graph Build Pipeline",
    6: "Query & Retrieval",
    7: "Document Delete Flow",
    8: "Stamped Domain",
    9: "Implementation Phases",
    10: "Graphify Scripts",
    11: "Misc",
    12: "Prisma Database",
    13: "Ingest Routes",
    14: "Query Routes",
    15: "Document Routes",
    16: "Graph Routes",
    17: "Admin Routes",
    18: "Config & Env",
    19: "Qdrant Vectors",
    20: "OpenAI Integration",
    21: "Frontend Query UI",
    22: "Frontend Ingest UI",
    23: "Frontend Documents",
    24: "Frontend Graph Page",
    25: "Frontend Entities",
    26: "Navigation Layout",
    27: "Utilities",
    28: "Batch Ingestion",
    29: "Graph Expansion",
}

for cid in communities:
    if cid not in labels:
        labels[cid] = f"Community {cid}"

questions = suggest_questions(G, communities, labels)
report = generate(
    G,
    communities,
    cohesion,
    labels,
    analysis["gods"],
    analysis["surprises"],
    detection,
    tokens,
    str(root),
    suggested_questions=questions,
)
(root / "graphify-out" / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")
(root / ".graphify_labels.json").write_text(
    json.dumps({str(k): v for k, v in labels.items()}), encoding="utf-8"
)

if G.number_of_nodes() <= 5000:
    to_html(
        G,
        communities,
        str(root / "graphify-out" / "graph.html"),
        community_labels=labels,
    )
    print("graph.html written")
print("Report updated with community labels")
