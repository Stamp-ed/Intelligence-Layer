"""Build project graph (codebase) into graphify-out/project/."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def merge_detect(roots: list[Path]) -> dict:
    from graphify.detect import detect

    merged = {
        "files": {"code": [], "document": [], "paper": [], "image": [], "video": []},
        "total_files": 0,
        "total_words": 0,
        "needs_graph": True,
        "warning": None,
        "skipped_sensitive": [],
    }
    seen = set()
    for root in roots:
        if not root.exists():
            continue
        d = detect(root)
        for kind, paths in d.get("files", {}).items():
            for p in paths:
                if p not in seen:
                    seen.add(p)
                    merged["files"].setdefault(kind, []).append(p)
        merged["total_files"] += d.get("total_files", 0)
        merged["total_words"] += d.get("total_words", 0)
        merged["skipped_sensitive"].extend(d.get("skipped_sensitive", []))
    return merged


def main() -> int:
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "graphify-out" / "project"
    out_dir.mkdir(parents=True, exist_ok=True)

    roots = [
        ROOT / "apps",
        ROOT / "packages",
        ROOT / "scripts",
        ROOT / "README.md",
        ROOT / "stamped_intelligence_system_cursor_prompt.md",
    ]

    detect = merge_detect(roots)
    (ROOT / ".graphify_detect_project.json").write_text(
        json.dumps(detect, indent=2), encoding="utf-8"
    )

    from graphify.extract import collect_files, extract

    code_files = []
    for f in detect.get("files", {}).get("code", []):
        p = ROOT / f if not Path(f).is_absolute() else Path(f)
        code_files.extend(collect_files(p) if p.is_dir() else [p])

    if code_files:
        ast = extract(code_files)
    else:
        ast = {"nodes": [], "edges": [], "input_tokens": 0, "output_tokens": 0}

    # Reuse cached semantic chunks for project docs if present
    sem = {"nodes": [], "edges": [], "hyperedges": [], "input_tokens": 0, "output_tokens": 0}
    chunk = out_dir / ".graphify_chunk_01.json"
    if not chunk.exists():
        chunk = ROOT / "graphify-out" / ".graphify_chunk_01.json"
    if chunk.exists():
        sem = json.loads(chunk.read_text(encoding="utf-8"))

    seen = {n["id"] for n in ast["nodes"]}
    nodes = list(ast["nodes"])
    for n in sem.get("nodes", []):
        if n["id"] not in seen:
            nodes.append(n)
            seen.add(n["id"])

    merged = {
        "nodes": nodes,
        "edges": ast["edges"] + sem.get("edges", []),
        "hyperedges": sem.get("hyperedges", []),
        "input_tokens": sem.get("input_tokens", 0),
        "output_tokens": sem.get("output_tokens", 0),
    }

    extract_path = out_dir / "extraction.json"
    extract_path.write_text(json.dumps(merged, indent=2), encoding="utf-8")

    from graphify.build import build_from_json
    from graphify.cluster import cluster
    from graphify.export import to_json, to_html
    from graphify.analyze import god_nodes, surprising_connections, suggest_questions
    from graphify.report import generate

    G = build_from_json(merged)
    communities = cluster(G)
    labels = {cid: f"Community {cid}" for cid in communities}
    gods = god_nodes(G)
    surprises = surprising_connections(G, communities)
    questions = suggest_questions(G, communities, labels)
    tokens = {"input": merged.get("input_tokens", 0), "output": merged.get("output_tokens", 0)}

    report = generate(
        G,
        communities,
        {},
        labels,
        gods,
        surprises,
        detect,
        tokens,
        str(ROOT),
        suggested_questions=questions,
    )
    (out_dir / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")
    to_json(G, communities, str(out_dir / "graph.json"))
    if G.number_of_nodes() <= 5000:
        to_html(G, communities, str(out_dir / "graph.html"), community_labels=labels)

    meta = {
        "built_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "node_count": G.number_of_nodes(),
        "edge_count": G.number_of_edges(),
        "corpus_file_count": detect["total_files"],
        "source": "graphify",
        "graph_type": "project",
    }
    (out_dir / "build-meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"Project graph: {meta['node_count']} nodes, {meta['edge_count']} edges")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
