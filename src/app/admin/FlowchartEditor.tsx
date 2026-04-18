'use client';

/**
 * Visual flowchart editor for admin use.
 * Canvas-style SVG editor supporting:
 * - Drag to reposition nodes
 * - Click to select, double-click to edit label
 * - Add node/edge via toolbar
 * - Delete selected node (along with its edges)
 * - Click-and-drag from node edge to create new edge
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { ColorField } from './ColorField';

interface FlowchartNode {
  id: string;
  type: 'start' | 'decision' | 'result';
  label: string;
  x: number;
  y: number;
  color?: string;
}

interface FlowchartEdge {
  from: string;
  to: string;
  label?: string;
}

interface FlowchartData {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  [k: string]: unknown;
}

const NODE_W = 160;
const NODE_H = 56;
const NODE_H_START = 40;

function nodeHeight(type: FlowchartNode['type']) {
  return type === 'start' ? NODE_H_START : NODE_H;
}

function nodeColor(n: FlowchartNode): string {
  if (n.color) return n.color;
  if (n.type === 'start') return '#6366f1';
  if (n.type === 'decision') return '#f59e0b';
  return '#3b82f6';
}

function nextNodeId(nodes: FlowchartNode[]): string {
  let n = 1;
  while (nodes.some(x => x.id === `node-${n}`)) n++;
  return `node-${n}`;
}

// ── Component ──────────────────────────────────────────────

export function FlowchartEditor({
  value,
  onChange,
}: {
  value: FlowchartData;
  onChange: (v: FlowchartData) => void;
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<number | null>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const nodes = value.nodes || [];
  const edges = value.edges || [];

  const updateNode = useCallback((id: string, patch: Partial<FlowchartNode>) => {
    onChange({ ...value, nodes: nodes.map(n => n.id === id ? { ...n, ...patch } : n) });
  }, [nodes, value, onChange]);

  const deleteNode = (id: string) => {
    onChange({
      ...value,
      nodes: nodes.filter(n => n.id !== id),
      edges: edges.filter(e => e.from !== id && e.to !== id),
    });
    setSelectedNodeId(null);
  };

  const addNode = (type: FlowchartNode['type']) => {
    const newNode: FlowchartNode = {
      id: nextNodeId(nodes),
      type,
      label: type === 'start' ? '起点' : type === 'decision' ? '判断' : '结果',
      x: 300,
      y: 300,
    };
    onChange({ ...value, nodes: [...nodes, newNode] });
    setSelectedNodeId(newNode.id);
  };

  const addEdge = (from: string, to: string) => {
    if (from === to) return;
    if (edges.some(e => e.from === from && e.to === to)) return;
    onChange({ ...value, edges: [...edges, { from, to }] });
  };

  const deleteEdge = (i: number) => {
    onChange({ ...value, edges: edges.filter((_, idx) => idx !== i) });
    setSelectedEdge(null);
  };

  const updateEdge = (i: number, patch: Partial<FlowchartEdge>) => {
    onChange({ ...value, edges: edges.map((e, idx) => idx === i ? { ...e, ...patch } : e) });
  };

  // Drag handlers
  const onNodeMouseDown = (e: React.MouseEvent, n: FlowchartNode) => {
    if (connectFrom) {
      // In connect mode — this is the target node
      addEdge(connectFrom, n.id);
      setConnectFrom(null);
      return;
    }
    e.stopPropagation();
    setSelectedNodeId(n.id);
    setSelectedEdge(null);
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging({ id: n.id, offsetX: e.clientX - rect.left - n.x, offsetY: e.clientY - rect.top - n.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    updateNode(dragging.id, {
      x: e.clientX - rect.left - dragging.offsetX,
      y: e.clientY - rect.top - dragging.offsetY,
    });
  };

  const onMouseUp = () => setDragging(null);

  // Compute viewbox to fit all nodes
  const vb = (() => {
    if (nodes.length === 0) return { minX: 0, minY: 0, width: 800, height: 500 };
    const pad = 40;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const n of nodes) {
      x1 = Math.min(x1, n.x - NODE_W / 2);
      y1 = Math.min(y1, n.y);
      x2 = Math.max(x2, n.x + NODE_W / 2);
      y2 = Math.max(y2, n.y + nodeHeight(n.type));
    }
    return { minX: x1 - pad, minY: y1 - pad, width: Math.max(x2 - x1 + pad * 2, 600), height: Math.max(y2 - y1 + pad * 2, 400) };
  })();

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
  const selectedEdgeData = selectedEdge != null ? edges[selectedEdge] : null;

  // Escape cancels connect mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectFrom(null);
        setSelectedNodeId(null);
        setSelectedEdge(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-3 p-3 rounded-xl" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
        <button onClick={() => addNode('start')} className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer" style={{ background: 'var(--accent)', color: '#fff' }}>
          + 起点
        </button>
        <button onClick={() => addNode('decision')} className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer" style={{ background: '#f59e0b', color: '#fff' }}>
          + 判断
        </button>
        <button onClick={() => addNode('result')} className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer" style={{ background: '#3b82f6', color: '#fff' }}>
          + 结果
        </button>
        <span className="w-px h-6 mx-1" style={{ background: 'var(--border)' }} />
        <button
          onClick={() => {
            if (!selectedNodeId) return;
            setConnectFrom(selectedNodeId);
          }}
          disabled={!selectedNodeId}
          className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
          style={{
            background: connectFrom ? '#22c55e' : 'var(--card)',
            color: connectFrom ? '#fff' : 'var(--fg)',
            border: '1px solid var(--border)',
            opacity: selectedNodeId ? 1 : 0.4,
          }}
        >
          {connectFrom ? `→ 点击目标节点（Esc 取消）` : '连线'}
        </button>
        {selectedNode && (
          <button
            onClick={() => deleteNode(selectedNode.id)}
            className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            删除选中节点
          </button>
        )}
        {selectedEdgeData && (
          <button
            onClick={() => selectedEdge != null && deleteEdge(selectedEdge)}
            className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            删除选中连线
          </button>
        )}
        <span className="ml-auto text-[10px]" style={{ color: 'var(--fg-muted)', alignSelf: 'center' }}>
          拖拽节点重新定位 · 点击节点选中 · 双击标签编辑
        </span>
      </div>

      {/* Canvas */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
        <svg
          ref={svgRef}
          viewBox={`${vb.minX} ${vb.minY} ${vb.width} ${vb.height}`}
          width="100%"
          style={{ minHeight: 420, maxHeight: 600, cursor: dragging ? 'grabbing' : connectFrom ? 'crosshair' : 'default' }}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onClick={() => { setSelectedNodeId(null); setSelectedEdge(null); }}
        >
          <defs>
            <marker id="edit-arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--fg-muted)" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((e, i) => {
            const from = nodes.find(n => n.id === e.from);
            const to = nodes.find(n => n.id === e.to);
            if (!from || !to) return null;
            const fx = from.x, fy = from.y + nodeHeight(from.type) / 2;
            const tx = to.x, ty = to.y + nodeHeight(to.type) / 2;
            const selected = selectedEdge === i;
            return (
              <g
                key={i}
                onClick={(ev) => { ev.stopPropagation(); setSelectedEdge(i); setSelectedNodeId(null); }}
                style={{ cursor: 'pointer' }}
              >
                <line
                  x1={fx} y1={fy} x2={tx} y2={ty}
                  stroke={selected ? 'var(--accent)' : 'var(--fg-muted)'}
                  strokeWidth={selected ? 3 : 2}
                  markerEnd="url(#edit-arrowhead)"
                  opacity={selected ? 1 : 0.7}
                />
                {/* Wider invisible hit area */}
                <line x1={fx} y1={fy} x2={tx} y2={ty} stroke="transparent" strokeWidth={12} />
                {e.label && (
                  <g transform={`translate(${(fx + tx) / 2}, ${(fy + ty) / 2})`}>
                    <rect x={-e.label.length * 4 - 4} y={-9} width={e.label.length * 8 + 8} height={18} rx={4}
                      fill="var(--card)" stroke="var(--border)" />
                    <text textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600} fill="var(--accent)">
                      {e.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map(n => {
            const w = NODE_W;
            const h = nodeHeight(n.type);
            const selected = selectedNodeId === n.id;
            const isConnectTarget = !!connectFrom && connectFrom !== n.id;
            const color = nodeColor(n);
            return (
              <g
                key={n.id}
                transform={`translate(${n.x - w / 2}, ${n.y})`}
                onMouseDown={(e) => onNodeMouseDown(e, n)}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => { e.stopPropagation(); setEditingLabel(n.id); }}
                style={{ cursor: dragging?.id === n.id ? 'grabbing' : 'grab' }}
              >
                {n.type === 'decision' ? (
                  <polygon
                    points={`${w/2},0 ${w+8},${h/2} ${w/2},${h} ${-8},${h/2}`}
                    fill="var(--card)"
                    stroke={selected ? 'var(--accent)' : isConnectTarget ? '#22c55e' : color}
                    strokeWidth={selected || isConnectTarget ? 3 : 2}
                  />
                ) : (
                  <rect
                    width={w}
                    height={h}
                    rx={n.type === 'start' ? h / 2 : 10}
                    fill={n.type === 'start' ? color : 'var(--card)'}
                    fillOpacity={n.type === 'start' ? 0.9 : 0.15}
                    stroke={selected ? 'var(--accent)' : isConnectTarget ? '#22c55e' : color}
                    strokeWidth={selected || isConnectTarget ? 3 : 2}
                  />
                )}
                {n.label.split('\n').map((line, i, arr) => (
                  <text
                    key={i}
                    x={w / 2}
                    y={h / 2 + (i - (arr.length - 1) / 2) * 14}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={n.type === 'start' ? 13 : 11}
                    fontWeight={n.type === 'start' ? 700 : 600}
                    fill={n.type === 'start' ? '#fff' : color}
                    pointerEvents="none"
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Inspector */}
      {selectedNode && (
        <NodeInspector
          node={selectedNode}
          onChange={(patch) => updateNode(selectedNode.id, patch)}
          onLabelEdit={editingLabel === selectedNode.id}
          onLabelEditEnd={() => setEditingLabel(null)}
        />
      )}
      {selectedEdgeData && selectedEdge != null && (
        <EdgeInspector
          edge={selectedEdgeData}
          nodes={nodes}
          onChange={(patch) => updateEdge(selectedEdge, patch)}
        />
      )}

      {nodes.length === 0 && (
        <p className="text-xs text-center mt-3" style={{ color: 'var(--fg-muted)' }}>
          空白画布 — 点击上方按钮添加起点、判断或结果节点
        </p>
      )}
    </div>
  );
}

// ── Inspectors ─────────────────────────────────────────────

function NodeInspector({
  node, onChange, onLabelEdit, onLabelEditEnd,
}: {
  node: FlowchartNode;
  onChange: (p: Partial<FlowchartNode>) => void;
  onLabelEdit: boolean;
  onLabelEditEnd: () => void;
}) {
  return (
    <div className="mt-3 p-4 rounded-xl" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
      <div className="text-xs font-semibold mb-3" style={{ color: 'var(--fg)' }}>
        节点属性 · <code className="font-mono text-[11px]">{node.id}</code>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>ID</label>
          <input
            type="text"
            value={node.id}
            onChange={e => onChange({ id: e.target.value })}
            className="w-full px-2 py-1.5 rounded text-xs font-mono outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>类型</label>
          <select
            value={node.type}
            onChange={e => onChange({ type: e.target.value as FlowchartNode['type'] })}
            className="w-full px-2 py-1.5 rounded text-xs outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          >
            <option value="start">起点 (start)</option>
            <option value="decision">判断 (decision)</option>
            <option value="result">结果 (result)</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>
            标签（支持换行，用 \n 分隔）
          </label>
          <textarea
            autoFocus={onLabelEdit}
            onBlur={onLabelEditEnd}
            value={node.label}
            onChange={e => onChange({ label: e.target.value })}
            rows={2}
            className="w-full px-2 py-1.5 rounded text-xs outline-none resize-y"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>X</label>
          <input type="number" value={node.x} onChange={e => onChange({ x: Number(e.target.value) })}
            className="w-full px-2 py-1.5 rounded text-xs outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
        </div>
        <div>
          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>Y</label>
          <input type="number" value={node.y} onChange={e => onChange({ y: Number(e.target.value) })}
            className="w-full px-2 py-1.5 rounded text-xs outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>颜色</label>
          <ColorField value={node.color || ''} onChange={v => onChange({ color: v || undefined })} />
        </div>
      </div>
    </div>
  );
}

function EdgeInspector({
  edge, nodes, onChange,
}: {
  edge: FlowchartEdge;
  nodes: FlowchartNode[];
  onChange: (p: Partial<FlowchartEdge>) => void;
}) {
  return (
    <div className="mt-3 p-4 rounded-xl" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
      <div className="text-xs font-semibold mb-3" style={{ color: 'var(--fg)' }}>
        连线属性
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>起点</label>
          <select value={edge.from} onChange={e => onChange({ from: e.target.value })}
            className="w-full px-2 py-1.5 rounded text-xs outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
            {nodes.map(n => <option key={n.id} value={n.id}>{n.id} · {n.label.split('\n')[0]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>终点</label>
          <select value={edge.to} onChange={e => onChange({ to: e.target.value })}
            className="w-full px-2 py-1.5 rounded text-xs outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
            {nodes.map(n => <option key={n.id} value={n.id}>{n.id} · {n.label.split('\n')[0]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>标签</label>
          <input type="text" value={edge.label || ''} onChange={e => onChange({ label: e.target.value })}
            placeholder="+ / − / 阳性"
            className="w-full px-2 py-1.5 rounded text-xs outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
        </div>
      </div>
    </div>
  );
}
