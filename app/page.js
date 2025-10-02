'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Graph from '../components/Graph';
import Sidebar from '../components/Sidebar';
import DFMEAAIAssistant from '../components/DFMEAAIAssistant';

export default function Page() {
  const [data, setData] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [activeRelTypes, setActiveRelTypes] = useState(new Set([
    'CONTAINS',
    'INTERFACE_WITH',
    'HAS_FUNCTION',
    'HAS_FAILURE_MODE',
    'LEADS_TO_EFFECT',
    'CAUSED_BY',
    'MITIGATED_BY',
    'DETECTED_BY',
    'RECOMMENDED_ACTION',
    'VALIDATED_BY',
    'ANALYZED_BY',
    'MAPPED_BY',
    'CRITICAL_TO',
    'INPUT_TO',
    'OUTPUT_TO',
    'CONTROL',
    'NOISE',
    'ERROR_STATE'
  ]));
  const [activeSteps, setActiveSteps] = useState(new Set(['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5', 'Step 6']));
  const [showCrossLinks, setShowCrossLinks] = useState(true);
  const [maxDepth, setMaxDepth] = useState(2);
  const [query, setQuery] = useState('');
  const [rootId, setRootId] = useState(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);

  useEffect(() => {
    async function load() {
      const res = await fetch('/dfmea.json');
      const json = await res.json();
      setData(json);
      // default root: the main system
      const sys = json.nodes.find(n => n.type === 'System' && n.label.includes('Power Liftgate'));
      setRootId(sys ? sys.id : json.nodes[0]?.id);
      setSelectedNodeId(sys ? sys.id : json.nodes[0]?.id);
    }
    load();
  }, []);

  const relTypesList = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.edges.map(e => e.type));
    return Array.from(set).sort();
  }, [data]);

  const stepsList = ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5', 'Step 6'];

  const onToggleRelType = (t) => {
    const next = new Set(activeRelTypes);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    setActiveRelTypes(next);
  };

  const onToggleStep = (s) => {
    const next = new Set(activeSteps);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setActiveSteps(next);
  };

  // helper: match "Step 4–6", "Step 2-4", "Step 3", "All"
  function edgeMatchesSteps(edge, stepsSet) {
    // If no steps are selected, don't filter by step (show everything)
    if (!stepsSet || stepsSet.size === 0) return true;

    const raw = edge.step;
    if (!raw) return true; // no step info => keep
    const norm = String(raw).trim();
    if (norm.toLowerCase() === 'all') return true;

    // Normalize en/em/thin dashes to hyphen
    const s = norm.replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-');

    // Try to capture "Step X-Y" or "Step X"
    const m = s.match(/Step\s*(\d)(?:\s*-\s*(\d))?$/i);
    if (m) {
      const a = parseInt(m[1], 10);
      const b = m[2] ? parseInt(m[2], 10) : a;
      for (let i = a; i <= b; i++) {
        if (stepsSet.has(`Step ${i}`)) return true;
      }
      return false;
    }

    // Fallback: if JSON has custom tokens, allow direct match
    return stepsSet.has(s);
  }

  const filteredEdges = useMemo(() => {
    if (!data) return [];
    return data.edges.filter(e => {
      if (!activeRelTypes.has(e.type)) return false;
      if (!edgeMatchesSteps(e, activeSteps)) return false;
      if (!showCrossLinks && e.attrs?.crossSystem) return false;
      return true;
    });
  }, [data, activeRelTypes, activeSteps, showCrossLinks]);

  const nodesIndex = useMemo(() => {
    if (!data) return new Map();
    const m = new Map();
    for (const n of data.nodes) m.set(n.id, n);
    return m;
  }, [data]);

  const searchResults = useMemo(() => {
    if (!data || !query.trim()) return [];
    const q = query.toLowerCase();
    return data.nodes
      .filter(n => n.label.toLowerCase().includes(q) || (n.attrs?.code || '').toLowerCase().includes(q))
      .slice(0, 15);
  }, [data, query]);

  if (!data) {
    return (
      <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading DFMEA graph…</div>
      </div>
    );
  }

  const selectedNode = selectedNodeId ? nodesIndex.get(selectedNodeId) : null;

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        <div className="font-semibold text-xl">DFMEA Graph Viewer — Power Liftgate</div>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search nodes (label or code)…"
              className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
            />
            {query && (
              <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 mt-1 rounded max-h-72 overflow-auto z-20">
                {searchResults.length === 0 && (
                  <div className="px-3 py-2 text-slate-400 text-sm">No matches</div>
                )}
                {searchResults.map(n => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setSelectedNodeId(n.id);
                      setRootId(n.id);
                      setQuery('');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-700"
                  >
                    <div className="text-sm">{n.label}</div>
                    <div className="text-xs text-slate-400">{n.type} • {n.id}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              const sys = data.nodes.find(n => n.type === 'System' && n.label.includes('Power Liftgate'));
              if (sys) { setRootId(sys.id); setSelectedNodeId(sys.id); }
            }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-sm"
          >
            Center on System
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-0">
        {/* Controls */}
        <div className="col-span-3 border-r border-slate-800 p-3 space-y-4">
          <div>
            <div className="font-semibold mb-2 text-slate-200">View Filters</div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-300">Show cross-system links</label>
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={showCrossLinks}
                onChange={e => setShowCrossLinks(e.target.checked)}
              />
            </div>
            <div className="mb-2">
              <label className="text-sm text-slate-300">Max expand depth: {maxDepth}</label>
              <input
                type="range"
                min="1"
                max="5"
                value={maxDepth}
                onChange={e => setMaxDepth(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>

          <div>
            <div className="font-semibold mb-2 text-slate-200">DFMEA Steps</div>
            <div className="grid grid-cols-2 gap-2 max-h-44 overflow-auto">
              {stepsList.map(s => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={activeSteps.has(s)}
                    onChange={() => onToggleStep(s)}
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>
            {activeSteps.size === 0 && (
              <div className="mt-2 text-xs text-amber-300">
                No steps selected — showing all steps.
              </div>
            )}
          </div>

          <div>
            <div className="font-semibold mb-2 text-slate-200">Relationship Types</div>
            <div className="max-h-60 overflow-auto border border-slate-800 rounded">
              {relTypesList.map(t => (
                <label key={t} className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 last:border-b-0">
                  <span className="text-sm">{t}</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={activeRelTypes.has(t)}
                    onChange={() => onToggleRelType(t)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Tip: <span className="text-slate-300">Shift+Click</span> a node to expand its neighbors.
            <br/>
            <span className="text-slate-300">Alt+Click</span> a node to ask AI about it.
          </div>
        </div>

        {/* Graph */}
        <div className="col-span-6 relative">
          <Graph
            data={data}
            filteredEdges={filteredEdges}
            rootId={rootId}
            onRootChange={setRootId}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            maxDepth={maxDepth}
            highlightedNodeId={highlightedNodeId}
            onAltClick={setHighlightedNodeId}
          />
        </div>

        {/* Sidebar */}
        <div className="col-span-3 border-l border-slate-800">
          <Sidebar
            selectedNode={selectedNode}
            nodesIndex={nodesIndex}
            edges={filteredEdges}
            onFocusNode={(id) => { setSelectedNodeId(id); setRootId(id); }}
          />
        </div>
      </div>

      {/* AI Assistant */}
      <DFMEAAIAssistant 
        data={data}
        filteredEdges={filteredEdges}
        nodesIndex={nodesIndex}
        highlightedNodeId={highlightedNodeId}
        onClearHighlight={() => setHighlightedNodeId(null)}
      />
    </div>
  );
}