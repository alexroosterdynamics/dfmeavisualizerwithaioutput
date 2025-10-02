"use client"

import { useMemo, useState } from "react"
import {
  Hash,
  Link2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ShieldAlert,
  Star,
  Sparkles,
  Info,
  Filter,
  LayoutGrid,
  AlertTriangle
} from "lucide-react"

/**
 * Sidebar — redesigned with a vibrant blue→indigo / fuchsia→pink aesthetic,
 * glassy cards, animated sections, and quality-of-life touches (copy buttons,
 * collapsible link groups, inline filters). Functionality is unchanged.
 */
export default function Sidebar({
  selectedNode,
  nodesIndex,
  edges,
  onFocusNode
}) {
  const [copiedKey, setCopiedKey] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [linkFilter, setLinkFilter] = useState("")

  // ────────────────────────────────────────────────────────────────────────────────
  // Empty state
  // ────────────────────────────────────────────────────────────────────────────────
  if (!selectedNode) {
    return (
      <div className="p-4 text-slate-300">
        <div className="font-semibold flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-blue-400" />
          Node Details
        </div>
        <div className="text-sm text-slate-400 mt-2">
          Select a node to inspect attributes, SCs, risks, and linked elements.
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────────────
  // Derivations
  // ────────────────────────────────────────────────────────────────────────────────
  const nodeEdges = useMemo(
    () =>
      edges.filter(e => e.from === selectedNode.id || e.to === selectedNode.id),
    [edges, selectedNode.id]
  )

  const grouped = useMemo(() => groupBy(nodeEdges, e => e.type || "Related"), [
    nodeEdges
  ])

  const attrs = selectedNode.attrs || {}
  const hasRisk = attrs.S || attrs.O || attrs.D || attrs.RPN

  const filteredGrouped = useMemo(() => {
    if (!linkFilter.trim()) return grouped
    const q = linkFilter.toLowerCase()
    const next = {}
    Object.entries(grouped).forEach(([type, arr]) => {
      const subset = arr.filter(e => {
        const otherId = e.from === selectedNode.id ? e.to : e.from
        const other = nodesIndex.get(otherId)
        const label = (other?.label || otherId || "").toLowerCase()
        const t = (other?.type || "").toLowerCase()
        const step = (e.step ? String(e.step) : "").toLowerCase()
        return (
          type.toLowerCase().includes(q) ||
          label.includes(q) ||
          t.includes(q) ||
          step.includes(q) ||
          String(otherId)
            .toLowerCase()
            .includes(q)
        )
      })
      if (subset.length) next[type] = subset
    })
    return next
  }, [grouped, linkFilter, nodesIndex, selectedNode.id])

  // Default expand all groups on first render
  useState(() => {
    const init = {}
    Object.keys(grouped).forEach(k => (init[k] = true))
    setExpandedGroups(init)
  })

  // ────────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────────────────────
  const copy = (text, key) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1200)
    })
  }

  const toggle = group =>
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }))

  // ────────────────────────────────────────────────────────────────────────────────
  // UI
  // ────────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-57px)] overflow-auto p-4 selection:bg-fuchsia-500/30 selection:text-fuchsia-100">
      {/* Header */}
      <div className="mb-4 rounded-2xl border border-slate-700/80 bg-slate-900/70 backdrop-blur-sm shadow-2xl shadow-blue-900/10 overflow-hidden animate-in fade-in slide-in-from-top-1">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-white/80">
              {selectedNode.type}
            </div>
            <div className="text-lg font-semibold text-white truncate">
              {selectedNode.label}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {attrs.code && (
              <button
                onClick={() => copy(String(attrs.code), "code")}
                className="text-white/90 hover:text-white bg-white/10 hover:bg-white/15 px-2 py-1 rounded-md text-xs flex items-center gap-1"
                title="Copy code"
              >
                <Hash className="w-3.5 h-3.5" />
                {copiedKey === "code" ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  "Code"
                )}
              </button>
            )}
            <button
              onClick={() => copy(String(selectedNode.id), "id")}
              className="text-white/90 hover:text-white bg-white/10 hover:bg-white/15 p-2 rounded-md"
              title="Copy node ID"
            >
              {copiedKey === "id" ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Quick meta row */}
        <div className="px-4 py-2 flex items-center gap-2 text-xs text-slate-300/90 bg-slate-900/60 border-t border-slate-700/60">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span className="truncate">ID: {selectedNode.id}</span>
        </div>
      </div>

      {/* Risk Summary */}
      {hasRisk && (
        <div className="mb-4 rounded-2xl border border-slate-700/80 bg-slate-900/70 backdrop-blur-sm shadow-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Risk (S / O / D / RPN)
          </div>
          <div className="p-3 grid grid-cols-4 gap-2">
            <Metric label="S" value={attrs.S} />
            <Metric label="O" value={attrs.O} />
            <Metric label="D" value={attrs.D} />
            <Metric label="RPN" value={attrs.RPN} />
          </div>
        </div>
      )}

      {/* Special Characteristic */}
      {attrs.SpecialCharacteristic && (
        <div className="mb-4 rounded-2xl border border-slate-700/80 bg-slate-900/70 backdrop-blur-sm shadow-lg overflow-hidden">
          <div className="px-4 py-2.5 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-300" />
            <div className="font-semibold text-slate-200">
              Special Characteristic
            </div>
          </div>
          <div className="px-4 pb-4 -mt-1">
            <span className="inline-flex items-center gap-2 text-sm px-2.5 py-1.5 rounded-md border border-amber-400/30 bg-amber-500/10 text-amber-200">
              <Sparkles className="w-4 h-4" />
              {attrs.SpecialCharacteristic}
            </span>
          </div>
        </div>
      )}

      {/* Attributes */}
      {Object.keys(attrs).length > 0 && (
        <div className="mb-4 rounded-2xl border border-slate-700/80 bg-slate-900/70 backdrop-blur-sm shadow-lg overflow-hidden">
          <div className="px-4 py-2.5 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-blue-400" />
            <div className="font-semibold text-slate-200">Attributes</div>
          </div>
          <div className="divide-y divide-slate-800/80">
            {Object.entries(attrs).map(([k, v], i, arr) => (
              <div
                key={k}
                className="px-4 py-2.5 text-sm flex items-start justify-between hover:bg-slate-800/40 transition-colors"
              >
                <div className="text-slate-400 pr-3">{k}</div>
                <div className="text-slate-200 ml-2 max-w-[60%] truncate">
                  <ValuePill value={v} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked Elements */}
      <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 backdrop-blur-sm shadow-2xl overflow-hidden">
        <div className="px-4 py-2.5 flex items-center justify-between bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-b border-slate-700/70">
          <div className="font-semibold text-slate-200 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-400" />
            Linked Elements
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={linkFilter}
              onChange={e => setLinkFilter(e.target.value)}
              placeholder="Filter…"
              className="pl-8 pr-3 py-1.5 text-xs rounded-md bg-slate-900/80 border border-slate-700/80 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-800/80">
          {Object.keys(filteredGrouped).length === 0 && (
            <div className="p-4 text-sm text-slate-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-fuchsia-400" />
              No links match your filter.
            </div>
          )}

          {Object.entries(filteredGrouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([type, arr]) => {
              const open = expandedGroups[type] ?? true
              return (
                <div key={type} className="group">
                  <button
                    onClick={() => toggle(type)}
                    className="w-full px-4 py-2.5 bg-slate-900/40 hover:bg-slate-800/40 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {open ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="text-sm text-slate-200">{type}</span>
                    </div>
                    <span className="text-[11px] text-slate-300 bg-slate-800/80 border border-slate-700/70 rounded px-2 py-0.5">
                      {arr.length}
                    </span>
                  </button>

                  {open && (
                    <div className="divide-y divide-slate-800/80 animate-in fade-in slide-in-from-top-1">
                      {arr.map(e => {
                        const otherId =
                          e.from === selectedNode.id ? e.to : e.from
                        const other = nodesIndex.get(otherId)
                        return (
                          <button
                            key={e.id}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-800/40 transition-colors"
                            onClick={() => onFocusNode(otherId)}
                          >
                            <div className="text-sm text-slate-100 truncate">
                              {other?.label || otherId}
                            </div>
                            <div className="text-xs text-slate-400">
                              {other?.type} • {otherId}
                            </div>
                            {e.step && (
                              <div className="text-[10px] text-slate-500 mt-1">
                                Step: {e.step}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      </div>

      {/* Helper */}
      <div className="text-xs text-slate-500 mt-4">
        Hold <span className="text-slate-300">Shift</span> and click nodes on
        the canvas to expand/collapse neighbors.
      </div>

      {/* Local styles */}
      <style jsx>{`
        .animate-in {
          animation-duration: 180ms;
          animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
        }
        .fade-in {
          animation-name: fadeInKey;
        }
        .slide-in-from-top-1 {
          animation-name: slideInKey, fadeInKey;
        }
        @keyframes fadeInKey {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideInKey {
          from {
            transform: translateY(-4px);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────────
 * Small UI bits
 * ──────────────────────────────────────────────────────────────────────────────── */

function ValuePill({ value }) {
  if (value === null || value === undefined || value === "") {
    return (
      <span className="px-2 py-1 rounded bg-slate-800/60 border border-slate-700 text-slate-400">
        -
      </span>
    )
  }
  const t = typeof value
  if (t === "boolean") {
    return (
      <span
        className={`px-2 py-1 rounded border ${
          value
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
            : "bg-rose-500/10 border-rose-500/30 text-rose-200"
        }`}
      >
        {String(value)}
      </span>
    )
  }
  if (t === "number") {
    return (
      <span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-200">
        {String(value)}
      </span>
    )
  }
  if (Array.isArray(value)) {
    return (
      <span className="px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-200">
        {value.length ? value.join(", ") : "[]"}
      </span>
    )
  }
  if (t === "object") {
    return (
      <span className="px-2 py-1 rounded bg-slate-800/60 border border-slate-700 text-slate-200">
        {JSON.stringify(value)}
      </span>
    )
  }
  return (
    <span className="px-2 py-1 rounded bg-slate-800/60 border border-slate-700 text-slate-200">
      {String(value)}
    </span>
  )
}

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const k = keyFn(item)
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

function Metric({ label, value }) {
  const color =
    label === "RPN"
      ? "from-fuchsia-600 to-pink-600"
      : label === "S"
      ? "from-rose-600 to-rose-500"
      : label === "O"
      ? "from-amber-600 to-amber-500"
      : "from-emerald-600 to-emerald-500"
  return (
    <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-2 text-center shadow">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div
        className={`mt-1 text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r ${color}`}
      >
        {value ?? "-"}
      </div>
    </div>
  )
}

/**
 * Keep these helpers to preserve original behavior contracts.
 */
function formatVal(v) {
  if (v === null || v === undefined) return "-"
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}
