'use client';

export default function Sidebar({ selectedNode, nodesIndex, edges, onFocusNode }) {
  if (!selectedNode) {
    return (
      <div className="p-4 text-slate-300">
        <div className="font-semibold">Node Details</div>
        <div className="text-sm text-slate-400 mt-2">Select a node to inspect attributes, SCs, risks, and linked elements.</div>
      </div>
    );
  }

  const nodeEdges = edges.filter(e => e.from === selectedNode.id || e.to === selectedNode.id);
  const grouped = groupBy(nodeEdges, e => e.type);
  const attrs = selectedNode.attrs || {};

  return (
    <div className="h-[calc(100vh-57px)] overflow-auto p-4">
      <div className="mb-4">
        <div className="text-xs text-slate-400">{selectedNode.type}</div>
        <div className="text-lg font-semibold">{selectedNode.label}</div>
        {attrs.code && <div className="text-xs text-slate-400 mt-0.5">Code: {attrs.code}</div>}
      </div>

      {/* Key attributes */}
      {Object.keys(attrs).length > 0 && (
        <div className="mb-4">
          <div className="font-semibold mb-2">Attributes</div>
          <div className="border border-slate-800 rounded">
            {Object.entries(attrs).map(([k, v], i, arr) => (
              <div key={k} className={`px-3 py-2 text-sm flex justify-between ${i < arr.length - 1 ? 'border-b border-slate-800' : ''}`}>
                <div className="text-slate-400">{k}</div>
                <div className="text-slate-200 ml-2">{formatVal(v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk summary if present */}
      {(attrs.S || attrs.O || attrs.D || attrs.RPN) && (
        <div className="mb-4">
          <div className="font-semibold mb-2">Risk (S/O/D/RPN)</div>
          <div className="grid grid-cols-4 gap-2">
            <Metric label="S" value={attrs.S} />
            <Metric label="O" value={attrs.O} />
            <Metric label="D" value={attrs.D} />
            <Metric label="RPN" value={attrs.RPN} />
          </div>
        </div>
      )}

      {/* Special Characteristics */}
      {attrs.SpecialCharacteristic && (
        <div className="mb-4">
          <div className="font-semibold mb-2">Special Characteristic</div>
          <div className="text-sm">
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">{attrs.SpecialCharacteristic}</span>
          </div>
        </div>
      )}

      {/* Links */}
      <div>
        <div className="font-semibold mb-2">Linked Elements</div>
        <div className="space-y-3">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([type, arr]) => (
            <div key={type} className="border border-slate-800 rounded">
              <div className="px-3 py-2 bg-slate-800/60 flex items-center justify-between">
                <div className="text-sm">{type}</div>
                <div className="text-xs text-slate-400">{arr.length}</div>
              </div>
              <div className="divide-y divide-slate-800">
                {arr.map(e => {
                  const otherId = e.from === selectedNode.id ? e.to : e.from;
                  const other = nodesIndex.get(otherId);
                  return (
                    <button
                      key={e.id}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800"
                      onClick={() => onFocusNode(otherId)}
                    >
                      <div className="text-sm">{other?.label || otherId}</div>
                      <div className="text-xs text-slate-400">{other?.type} • {otherId}</div>
                      {e.step && <div className="text-[10px] text-slate-500 mt-1">Step: {e.step}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Helper */}
      <div className="text-xs text-slate-500 mt-4">
        Hold <span className="text-slate-300">Shift</span> and click nodes on the canvas to expand/collapse neighbors.
      </div>
    </div>
  );
}

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const k = keyFn(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

function Metric({ label, value }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded p-2 text-center">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-semibold">{value ?? '-'}</div>
    </div>
  );
}

function formatVal(v) {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
