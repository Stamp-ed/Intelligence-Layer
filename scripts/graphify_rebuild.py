"""Build graph artifacts from extraction JSON (uses graphify if installed)."""
import json
import sys
from pathlib import Path


def fallback_write(extraction: dict, out_dir: Path) -> None:
    graph = {
        "nodes": extraction.get("nodes", []),
        "links": [
            {
                "source": e["source"],
                "target": e["target"],
                "relation": e.get("relation", "related"),
                "confidence": e.get("confidence", "EXTRACTED"),
                "confidence_score": e.get("confidence_score", 1.0),
            }
            for e in extraction.get("edges", [])
        ],
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "graph.json").write_text(json.dumps(graph, indent=2), encoding="utf-8")


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: graphify_rebuild.py <extraction.json> <out_dir>", file=sys.stderr)
        return 1

    extract_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    extraction = json.loads(extract_path.read_text(encoding="utf-8"))

    try:
        from graphify.build import build_from_json
        from graphify.cluster import cluster
        from graphify.export import to_json, to_html

        g = build_from_json(extraction)
        communities = cluster(g)
        labels = {cid: f"Community {cid}" for cid in communities}
        to_json(g, communities, str(out_dir / "graph.json"))
        if g.number_of_nodes() <= 5000:
            to_html(g, communities, str(out_dir / "graph.html"), community_labels=labels)
        print(f"graphify: {g.number_of_nodes()} nodes, {g.number_of_edges()} edges")
        return 0
    except ImportError:
        fallback_write(extraction, out_dir)
        print("graphify not installed; wrote basic graph.json", file=sys.stderr)
        return 0
    except Exception as exc:
        print(f"graphify error: {exc}", file=sys.stderr)
        fallback_write(extraction, out_dir)
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
