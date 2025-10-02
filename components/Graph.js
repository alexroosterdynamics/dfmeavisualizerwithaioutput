'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// 2D-only build to avoid A-Frame
const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d'),
  { ssr: false }
);

/**
 * Strict-depth DFMEA graph (2D canvas)
 * - Visible nodes are those within <= maxDepth hops from any source.
 * - Sources = current root + any Shift+Clicked nodes (additional local sources).
 * - Click node: select + re-center root (clears expanded sources)
 * - Shift+Click node: toggle as an extra source (does NOT exceed maxDepth)
 * - Alt+Click node: highlight for AI assistant
 */
export default function Graph({
  data,
  filteredEdges,
  rootId,
  onRootChange,
  selectedNodeId,
  onSelectNode,
  maxDepth,
  highlightedNodeId,
  onAltClick
}) {
  const graphRef = useRef();
  const [extraSources, setExtraSources] = useState(() => new Set()); // shift-click sources
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [internalRoot, setInternalRoot] = useState(rootId);

  // index nodes
  const nodesIndex = useMemo(() => {
    const m = new Map();
    for (const n of data.nodes) m.set(n.id, n);
    return m;
  }, [data]);

  // neighbor map from filtered edges (undirected for distance)
  const neighborsMap = useMemo(() => {
    const m = new Map();
    for (const e of filteredEdges) {
      if (!m.has(e.from)) m.set(e.from, new Set());
      if (!m.has(e.to)) m.set(e.to, new Set());
      m.get(e.from).add(e.to);
      m.get(e.to).add(e.from);
    }
    return m;
  }, [filteredEdges]);

  // recompute visible subgraph whenever filters/root/depth change
  useEffect(() => {
    if (!internalRoot || !nodesIndex.has(internalRoot)) return;

    // multi-source BFS with strict hop cap
    const sources = new Set([internalRoot, ...extraSources]);
    const { visible, dist } = computeVisibleStrict(sources, neighborsMap, maxDepth);

    // edges between visible nodes only
    const visEdges = filteredEdges.filter(e => visible.has(e.from) && visible.has(e.to));

    // nodes array from visible
    const visNodes = Array.from(visible).map(id => {
      const n = nodesIndex.get(id);
      return {
        id,
        label: n?.label || id,
        type: n?.type || 'Node',
        attrs: n?.attrs || {},
        _dist: dist.get(id) // for optional styling by depth
      };
    });

    setGraphData({
      nodes: visNodes,
      links: visEdges.map(e => ({
        id: e.id,
        source: e.from,
        target: e.to,
        type: e.type,
        step: e.step,
        attrs: e.attrs || {}
      }))
    });
  }, [internalRoot, filteredEdges, maxDepth, extraSources, neighborsMap, nodesIndex]);

  // keep internal root in sync
  useEffect(() => {
    setInternalRoot(rootId);
    // when root changes from outside, clear extra sources to keep view tidy
    setExtraSources(new Set());
  }, [rootId]);

  // fit when graph changes
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    setTimeout(() => fg.zoomToFit(400, 80), 50);
  }, [graphData]);

  const handleNodeClick = (node, event) => {
    if (!node) return;
    const id = node.id;

    if (event && event.altKey) {
      // Alt+Click: highlight for AI assistant
      onAltClick(id);
    } else if (event && event.shiftKey) {
      // Shift+Click: toggle node as extra source (strictly bounded by maxDepth)
      setExtraSources(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      // Normal click: focus and recenter
      onSelectNode(id);
      onRootChange(id);
      setInternalRoot(id);
      // Reset expanded sources when recentering root
      setExtraSources(new Set());
    }
  };

  // colors
  const colorForType = (type) => {
    switch (type) {
      case 'System': return '#60a5fa';
      case 'Subsystem': return '#34d399';
      case 'Component': return '#f59e0b';
      case 'Interface': return '#f472b6';
      case 'Function': return '#22d3ee';
      case 'FailureMode': return '#f87171';
      case 'Effect': return '#fb7185';
      case 'Cause': return '#fbbf24';
      case 'Control': return '#a78bfa';
      case 'Action': return '#4ade80';
      case 'Characteristic': return '#c084fc';
      case 'Requirement': return '#93c5fd';
      case 'Risk': return '#fca5a5';
      case 'Tool': return '#67e8f9';
      case 'Test': return '#86efac';
      case 'Step': return '#cbd5e1';
      default: return '#94a3b8';
    }
  };

  const linkColor = (link) => (link?.attrs?.crossSystem ? '#f472b6' : '#a3b2c2');
  const arrowColor = (link) => (link?.attrs?.crossSystem ? '#f472b6' : '#a3b2c2');

  // node drawing
  const nodeCanvasObject = (node, ctx, globalScale) => {
    const radius = 5;
    const isSelected = node.id === selectedNodeId || node.id === internalRoot || extraSources.has(node.id);
    const isHighlighted = node.id === highlightedNodeId;
    const fill = colorForType(node.type);

    // Pulsing magenta highlight for AI-selected node
    if (isHighlighted) {
      const pulseRadius = radius + 6 + Math.sin(Date.now() / 300) * 2;
      ctx.beginPath();
      ctx.arc(node.x, node.y, pulseRadius, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(217, 70, 239, 0.3)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#d946ef';
      ctx.stroke();
    }

    if (isSelected && !isHighlighted) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = isHighlighted ? '#d946ef' : fill;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isHighlighted ? '#c026d3' : '#0f172a';
    ctx.stroke();

    const label = node.label || node.id;
    const fontSize = 10 / Math.max(0.5, globalScale);
    ctx.font = `${fontSize}px Inter, system-ui, -apple-system, Segoe UI, Roboto`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isHighlighted ? '#fdf4ff' : '#cbd5e1';
    ctx.fillText(label, node.x, node.y + radius + 3);
  };

  return (
    <div className="w-full h-[calc(100vh-57px)] relative bg-slate-900">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}

        // Make edges clearly visible
        linkOpacity={0.9}
        linkWidth={l => (l?.attrs?.crossSystem ? 2.2 : 1.8)}
        linkColor={linkColor}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={0.52}
        linkDirectionalArrowColor={arrowColor}

        nodeRelSize={6}
        linkDirectionalParticles={0}
        cooldownTicks={50}
        onEngineStop={() => {
          const fg = graphRef.current;
          if (fg) fg.zoomToFit(300, 50);
        }}
        onNodeClick={handleNodeClick}

        // Draw link labels after the built-in line
        linkCanvasObjectMode={() => 'after'}
        linkCanvasObject={(link, ctx, globalScale) => {
          if (globalScale < 1.2) return;
          const a = link.source;
          const b = link.target;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const text = link.type || '';
          const fontSize = 9 / Math.max(0.6, globalScale);
          ctx.font = `${fontSize}px Inter, system-ui, -apple-system`;
          ctx.fillStyle = '#94a3b8';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, mx, my);
        }}

        nodeCanvasObject={nodeCanvasObject}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        enableNodeDrag={true}
        backgroundColor="#0b1220"
      />

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-slate-800/80 backdrop-blur border border-slate-700 rounded p-2 text-xs text-slate-200">
        <div className="font-semibold mb-1">Legend</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          {['System','Subsystem','Component','Interface','Function','FailureMode','Effect','Cause','Control','Action','Characteristic','Requirement','Risk','Tool','Test'].map(t => (
            <div key={t} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: colorForType(t) }} />
              <span>{t}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-slate-400">Pink links = cross-system</div>
        <div className="mt-1 text-slate-400">
          Click = focus. Shift+Click = expand. Alt+Click = AI assist.
        </div>
      </div>
    </div>
  );
}

/**
 * Strict multi-source BFS:
 * - `sources`: Set of node ids used as BFS roots.
 * - Includes nodes whose distance from ANY source <= maxDepth.
 * - Undirected traversal using neighborsMap.
 */
function computeVisibleStrict(sources, neighborsMap, maxDepth) {
  const visible = new Set();
  const dist = new Map(); // nodeId -> shortest distance to any source
  const q = [];

  // seed queue with all sources at dist 0
  for (const s of sources) {
    if (!dist.has(s)) {
      dist.set(s, 0);
      visible.add(s);
      q.push(s);
    }
  }

  while (q.length) {
    const id = q.shift();
    const d = dist.get(id);
    if (d >= maxDepth) continue;

    const neigh = neighborsMap.get(id);
    if (!neigh) continue;

    for (const nb of neigh) {
      const nextD = d + 1;
      if (!dist.has(nb) || nextD < dist.get(nb)) {
        dist.set(nb, nextD);
        if (nextD <= maxDepth) {
          visible.add(nb);
          q.push(nb);
        }
      }
    }
  }

  return { visible, dist };
}