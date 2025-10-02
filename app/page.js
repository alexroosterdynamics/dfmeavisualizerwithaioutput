'use client';

import { useEffect, useMemo, useState } from 'react';
import Graph from '../components/Graph';
import Sidebar from '../components/Sidebar';
import DFMEAAIAssistant from '../components/DFMEAAIAssistant';
import {
  Sparkles,
  Search,
  SlidersHorizontal,
  House,
  Filter,
  Layers,
  Link2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

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
  const [maxDepth, setMaxDepth] = useState(6);
  const [query, setQuery] = useState('');
  const [rootId, setRootId] = useState(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(true);

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
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-lg">
          <Sparkles className="w-6 h-6 text-blue-400 animate-pulse" />
          <span className="animate-pulse">Loading DFMEA graph…</span>
        </div>
      </div>
    );
  }

  const selectedNode = selectedNodeId ? nodesIndex.get(selectedNodeId) : null;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* NAVBAR — gradient, glassy, sticky */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-lg">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 grid place-items-center shadow-lg shadow-blue-900/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-bold">DFMEA Graph Viewer</div>
              <div className="text-[11px] text-slate-400">Power Liftgate System</div>
            </div>
          </div>

          {/* Search */}
          <div className="ml-6 relative flex-1 max-w-xl">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search nodes by label or code…"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
            />
            {query && (
              <div className="absolute top-[110%] left-0 right-0 bg-slate-900/95 border border-slate-700 mt-1 rounded-lg max-h-80 overflow-auto shadow-2xl z-40">
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
                    className="w-full text-left px-3 py-2 hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="text-sm">{n.label}</div>
                    <div className="text-xs text-slate-400">{n.type} • {n.id}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                const sys = data.nodes.find(n => n.type === 'System' && n.label.includes('Power Liftgate'));
                if (sys) { setRootId(sys.id); setSelectedNodeId(sys.id); }
              }}
              className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-600/30 text-sm inline-flex items-center gap-2 transition-all"
              title="Center on system"
            >
              <House className="w-4 h-4" />
              Center on System
            </button>
            <button
              onClick={() => setFiltersOpen(o => !o)}
              className="px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm inline-flex items-center gap-2 hover:bg-slate-800 transition-colors"
              title="Toggle filters"
            >
              <SlidersHorizontal className="w-4 h-4 text-blue-400" />
              Filters
              {filtersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-0">
        {/* LEFT CONTROLS SIDEBAR — glass cards, gradients, toggles */}
        <div className={`col-span-3 border-r border-slate-800/80 p-3 space-y-4 bg-slate-950/30 ${filtersOpen ? 'block' : 'hidden md:block'}`}>
          {/* View Filters card */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-sm shadow-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-b border-slate-800/80 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-400" />
              <div className="font-semibold text-slate-200">View Filters</div>
            </div>
            <div className="p-4 space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Show cross-system links</span>
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-fuchsia-500"
                  checked={showCrossLinks}
                  onChange={e => setShowCrossLinks(e.target.checked)}
                />
              </label>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm text-slate-300">Max expand depth</label>
                  <span className="text-xs text-slate-400">{maxDepth}</span>
                </div>
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
          </div>

          {/* Steps card */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-sm shadow-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-gradient-to-r from-fuchsia-600/20 to-pink-600/20 border-b border-slate-800/80 flex items-center gap-2">
              <Layers className="w-4 h-4 text-fuchsia-400" />
              <div className="font-semibold text-slate-200">DFMEA Steps</div>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2 max-h-44 overflow-auto">
              {stepsList.map(s => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-fuchsia-500"
                    checked={activeSteps.has(s)}
                    onChange={() => onToggleStep(s)}
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>
            {activeSteps.size === 0 && (
              <div className="px-4 pb-3 text-xs text-amber-300">
                No steps selected — showing all steps.
              </div>
            )}
          </div>

          {/* Relationship Types card */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-sm shadow-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-b border-slate-800/80 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-400" />
              <div className="font-semibold text-slate-200">Relationship Types</div>
            </div>
            <div className="p-2">
              <div className="relative mb-2">
                <Filter className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                {/* simple local filter using browser's find (optional enhancement omitted to keep behavior same) */}
                <input
                  placeholder="Filter list…"
                  onChange={(e) => {
                    const q = e.target.value.toLowerCase();
                    const el = e.target.nextSibling; // not used, left for future
                    // no-op: keeping structure simple; main search is global in navbar
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-slate-900/80 border border-slate-700/80 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="max-h-60 overflow-auto border border-slate-800 rounded-lg">
                {relTypesList.map(t => (
                  <label key={t} className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/70 last:border-b-0 hover:bg-slate-800/40 transition-colors">
                    <span className="text-sm">{t}</span>
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-blue-500"
                      checked={activeRelTypes.has(t)}
                      onChange={() => onToggleRelType(t)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Tip: <span className="text-slate-300">Shift+Click</span> a node to expand its neighbors.
            <br />
            <span className="text-slate-300">Alt+Click</span> a node to ask AI about it.
          </div>
        </div>

        {/* GRAPH AREA */}
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

        {/* RIGHT DETAILS SIDEBAR — uses the redesigned Sidebar component you already have */}
        <div className="col-span-3 border-l border-slate-800/80 bg-slate-950/30">
          <Sidebar
            selectedNode={selectedNode}
            nodesIndex={nodesIndex}
            edges={filteredEdges}
            onFocusNode={(id) => { setSelectedNodeId(id); setRootId(id); }}
          />
        </div>
      </div>

      {/* FLOATING AI ASSISTANT (unchanged) */}
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
