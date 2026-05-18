"use client";

import { useEffect, useRef, useState } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import type { SigmaGraphPayload } from "@/lib/api";

interface SigmaGraphViewerProps {
  data: SigmaGraphPayload;
  height?: number;
}

export function SigmaGraphViewer({ data, height = 520 }: SigmaGraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || data.nodes.length === 0) return;

    const graph = new Graph({ multi: false, type: "undirected" });

    for (const node of data.nodes) {
      if (!graph.hasNode(node.id)) {
        graph.addNode(node.id, {
          label: node.label,
          size: node.size,
          color: node.color,
          x: node.x,
          y: node.y,
          nodeType: node.nodeType,
          channel: node.channel,
        });
      }
    }

    for (const edge of data.edges) {
      if (
        graph.hasNode(edge.source) &&
        graph.hasNode(edge.target) &&
        !graph.hasEdge(edge.id)
      ) {
        try {
          graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
            label: edge.label,
            size: 0.5,
            color: "rgba(43,44,48,0.15)",
          });
        } catch {
          /* parallel edge */
        }
      }
    }

    const renderer = new Sigma(graph, el, {
      renderEdgeLabels: false,
      labelRenderedSizeThreshold: 6,
      defaultNodeColor: "#F75440",
      defaultEdgeColor: "rgba(43,44,48,0.12)",
      labelFont: "Helvetica Neue, Arial, sans-serif",
      labelWeight: "600",
      labelSize: 12,
      zIndex: true,
    });

    renderer.on("enterNode", ({ node }) => {
      setHovered(graph.getNodeAttribute(node, "label") as string);
    });
    renderer.on("leaveNode", () => setHovered(null));

    return () => renderer.kill();
  }, [data]);

  if (data.nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-ink-secondary"
        style={{ height }}
      >
        No graph data to display.
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={containerRef} className="w-full h-full bg-[#F5F0E8]" />
      {data.channels.length > 0 && (
        <div className="absolute top-3 left-3 max-w-[220px] rounded-lg bg-white/95 p-3 text-xs shadow-sm border border-black/5">
          <p className="font-semibold text-ink mb-2">Channels</p>
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {data.channels.map((ch) => {
              const sample = data.nodes.find(
                (n) => n.nodeType === "channel" && n.label === ch,
              );
              return (
                <li key={ch} className="flex items-center gap-2 truncate">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: sample?.color ?? "#F75440" }}
                  />
                  <span className="truncate">{ch}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {hovered && (
        <div className="absolute bottom-3 left-3 rounded-md bg-white/95 px-3 py-2 text-xs font-medium text-ink shadow-sm border border-black/5">
          {hovered}
        </div>
      )}
    </div>
  );
}
