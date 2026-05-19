"use client";

import { useEffect, useRef } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import type { SigmaGraphNode, SigmaGraphPayload } from "@/lib/api";

interface SigmaGraphViewerProps {
  data: SigmaGraphPayload;
  height?: number;
  onNodeFocus?: (node: SigmaGraphNode | null) => void;
}

function brighten(hex: string, amount = 0.15): string {
  if (!hex.startsWith("#") || hex.length < 7) return hex;
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + 255 * amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + 255 * amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + 255 * amount);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function neighborSet(graph: Graph, nodeId: string): Set<string> {
  const out = new Set<string>([nodeId]);
  try {
    graph.forEachNeighbor(nodeId, (n) => out.add(n));
  } catch {
    /* ignore */
  }
  return out;
}

export function SigmaGraphViewer({
  data,
  height = 520,
  onNodeFocus,
}: SigmaGraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<{ hovered: string | null; selected: string | null }>({
    hovered: null,
    selected: null,
  });
  const onFocusRef = useRef(onNodeFocus);
  onFocusRef.current = onNodeFocus;
  const nodeMapRef = useRef(new Map<string, SigmaGraphNode>());

  useEffect(() => {
    nodeMapRef.current = new Map(data.nodes.map((n) => [n.id, n]));
  }, [data.nodes]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || data.nodes.length === 0) return;

    const graph = new Graph({ multi: false, type: "undirected" });

    for (const node of data.nodes) {
      if (!graph.hasNode(node.id)) {
        const isChannel = node.nodeType === "channel";
        const isEntity = node.nodeType === "entity";
        graph.addNode(node.id, {
          fullLabel: node.label,
          label: node.label,
          baseSize: node.size,
          size: node.size,
          color: node.color,
          activeColor: brighten(
            node.color,
            isEntity ? 0.4 : isChannel ? 0.08 : 0.15,
          ),
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
          const isChannelEdge = edge.label === "in_channel";
          graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
            size: isChannelEdge ? 0.35 : 0.2,
            color: isChannelEdge
              ? "rgba(247, 84, 64, 0.12)"
              : "rgba(43, 44, 48, 0.07)",
            relation: edge.label,
          });
        } catch {
          /* skip duplicate */
        }
      }
    }

    const emitFocus = (nodeId: string | null) => {
      if (!nodeId) {
        onFocusRef.current?.(null);
        return;
      }
      onFocusRef.current?.(nodeMapRef.current.get(nodeId) ?? null);
    };

    const activeNode = () =>
      interactionRef.current.selected ?? interactionRef.current.hovered;

    const renderer = new Sigma(graph, el, {
      renderEdgeLabels: false,
      labelRenderedSizeThreshold: 0,
      labelDensity: 0.55,
      hideLabelsOnMove: false,
      defaultNodeColor: "#94A3B8",
      defaultEdgeColor: "rgba(43,44,48,0.06)",
      labelFont: "Helvetica Neue, Arial, sans-serif",
      labelWeight: "600",
      labelSize: 10,
      labelColor: { color: "#2B2C30" },
      zIndex: true,
      minEdgeThickness: 0.35,
      zoomingRatio: 1.15,
      doubleClickZoomingRatio: 1.35,
      stagePadding: 24,
      nodeReducer: (node, attrs) => {
        const active = activeNode();
        const isActive = node === active;
        const isNeighbor =
          active && neighborSet(graph, active).has(node) && !isActive;
        const isChannel = attrs.nodeType === "channel";
        const isEntity = attrs.nodeType === "entity";
        const showLabel = isActive || isChannel;

        return {
          ...attrs,
          label: showLabel ? (attrs.fullLabel as string) : "",
          labelSize: isActive ? 12 : isChannel ? 10 : 0,
          size: isActive
            ? (attrs.baseSize as number) * 1.5
            : isNeighbor
              ? (attrs.baseSize as number) * 1.15
              : (attrs.baseSize as number),
          color: isActive
            ? (attrs.activeColor as string)
            : isNeighbor
              ? brighten(attrs.color as string, 0.1)
              : (attrs.color as string),
          borderColor: isChannel
            ? "rgba(255,255,255,0.9)"
            : isActive
              ? "#2B2C30"
              : undefined,
          borderSize: isChannel ? 0.25 : isActive ? 0.15 : 0,
          zIndex: isActive ? 10 : isNeighbor ? 5 : isChannel ? 3 : isEntity ? 1 : 2,
        };
      },
      edgeReducer: (edge, attrs) => {
        const active = activeNode();
        if (!active) return attrs;
        const ends = graph.extremities(edge);
        const lit =
          ends[0] === active ||
          ends[1] === active ||
          (neighborSet(graph, active).has(ends[0]) &&
            neighborSet(graph, active).has(ends[1]));
        return {
          ...attrs,
          color: lit ? "rgba(247, 84, 64, 0.35)" : "rgba(43, 44, 48, 0.04)",
          size: lit ? 0.6 : 0.15,
        };
      },
    });

    const refresh = () => renderer.refresh();

    renderer.on("enterNode", ({ node }) => {
      interactionRef.current.hovered = node;
      emitFocus(node);
      refresh();
    });

    renderer.on("leaveNode", () => {
      interactionRef.current.hovered = null;
      emitFocus(interactionRef.current.selected);
      refresh();
    });

    renderer.on("clickNode", ({ node }) => {
      interactionRef.current.selected =
        interactionRef.current.selected === node ? null : node;
      emitFocus(
        interactionRef.current.selected ?? interactionRef.current.hovered,
      );
      refresh();
    });

    renderer.on("clickStage", () => {
      interactionRef.current.selected = null;
      emitFocus(interactionRef.current.hovered);
      refresh();
    });

    requestAnimationFrame(() => {
      renderer.getCamera().animatedReset({ duration: 400 });
    });

    return () => {
      renderer.kill();
      interactionRef.current = { hovered: null, selected: null };
    };
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
    <div className="relative w-full rounded-lg overflow-hidden" style={{ height }}>
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, var(--content) 0%, var(--raised) 55%, var(--high-raised) 100%)",
        }}
      />
      <p className="absolute bottom-2 right-3 text-[10px] text-ink-dim pointer-events-none bg-white/60 px-2 py-0.5 rounded">
        Scroll to zoom · drag to pan · click to pin
      </p>
    </div>
  );
}
