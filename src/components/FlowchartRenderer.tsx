'use client';

import { useState, useRef, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────

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
  id: string;
  titleZh: string;
  relatedDifferentialId: string | null;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
}

// ── Geometry helpers ───────────────────────────────────────────────

const NODE_W = 160;
const NODE_H_START = 40;
const NODE_H_DECISION = 56;
const NODE_H_RESULT = 56;

function nodeHeight(type: FlowchartNode['type']): number {
  if (type === 'start') return NODE_H_START;
  if (type === 'decision') return NODE_H_DECISION;
  return NODE_H_RESULT;
}

/** Center point of a node */
function nodeCenter(n: FlowchartNode): { cx: number; cy: number } {
  return { cx: n.x, cy: n.y + nodeHeight(n.type) / 2 };
}

/** Compute the SVG viewBox to fit all nodes with padding */
function computeViewBox(nodes: FlowchartNode[]): { minX: number; minY: number; width: number; height: number } {
  const pad = 30;
  const halfW = NODE_W / 2;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const n of nodes) {
    const h = nodeHeight(n.type);
    x1 = Math.min(x1, n.x - halfW);
    y1 = Math.min(y1, n.y);
    x2 = Math.max(x2, n.x + halfW);
    y2 = Math.max(y2, n.y + h);
  }
  return { minX: x1 - pad, minY: y1 - pad, width: x2 - x1 + pad * 2, height: y2 - y1 + pad * 2 };
}

// ── Edge rendering ─────────────────────────────────────────────────

function EdgeLine({ from, to, label, nodes }: { from: string; to: string; label?: string; nodes: FlowchartNode[] }) {
  const fromNode = nodes.find(n => n.id === from);
  const toNode = nodes.find(n => n.id === to);
  if (!fromNode || !toNode) return null;

  const fc = nodeCenter(fromNode);
  const tc = nodeCenter(toNode);
  const fh = nodeHeight(fromNode.type) / 2;
  const th = nodeHeight(toNode.type) / 2;
  const halfW = NODE_W / 2;

  // Determine connection points based on relative positions
  let x1: number, y1: number, x2: number, y2: number;

  const dx = tc.cx - fc.cx;
  const dy = tc.cy - fc.cy;

  if (Math.abs(dy) > Math.abs(dx) * 0.5) {
    // Mostly vertical: connect bottom-to-top
    if (dy > 0) {
      x1 = fc.cx; y1 = fc.cy + fh;
      x2 = tc.cx; y2 = tc.cy - th;
    } else {
      x1 = fc.cx; y1 = fc.cy - fh;
      x2 = tc.cx; y2 = tc.cy + th;
    }
  } else {
    // Mostly horizontal: connect side-to-side
    if (dx > 0) {
      x1 = fc.cx + halfW; y1 = fc.cy;
      x2 = tc.cx - halfW; y2 = tc.cy;
    } else {
      x1 = fc.cx - halfW; y1 = fc.cy;
      x2 = tc.cx + halfW; y2 = tc.cy;
    }
  }

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  // Curved path for better visual flow
  const pathD = Math.abs(x1 - x2) < 5
    ? `M ${x1} ${y1} L ${x2} ${y2}`
    : `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;

  return (
    <g>
      <path
        d={pathD}
        fill="none"
        stroke="var(--fg-muted)"
        strokeWidth={1.5}
        markerEnd="url(#arrowhead)"
        opacity={0.6}
      />
      {label && (
        <g transform={`translate(${mx}, ${my})`}>
          <rect
            x={-label.length * 4 - 4}
            y={-9}
            width={label.length * 8 + 8}
            height={18}
            rx={4}
            fill="var(--card)"
            stroke="var(--border)"
            strokeWidth={0.5}
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={11}
            fontWeight={600}
            fill="var(--accent)"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

// ── Node rendering ─────────────────────────────────────────────────

function StartNode({ node, hovered, onHover }: { node: FlowchartNode; hovered: boolean; onHover: (id: string | null) => void }) {
  const w = NODE_W;
  const h = NODE_H_START;
  return (
    <g
      transform={`translate(${node.x - w / 2}, ${node.y})`}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      <rect
        width={w}
        height={h}
        rx={h / 2}
        fill="var(--accent)"
        stroke={hovered ? 'var(--fg)' : 'transparent'}
        strokeWidth={hovered ? 2 : 0}
        opacity={hovered ? 1 : 0.9}
      />
      <text
        x={w / 2}
        y={h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fontWeight={700}
        fill="#fff"
      >
        {node.label}
      </text>
    </g>
  );
}

function DecisionNode({ node, hovered, onHover }: { node: FlowchartNode; hovered: boolean; onHover: (id: string | null) => void }) {
  const w = NODE_W;
  const h = NODE_H_DECISION;
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 + 8;
  const ry = h / 2 + 4;
  // Diamond shape
  const points = `${cx},${cy - ry} ${cx + rx},${cy} ${cx},${cy + ry} ${cx - rx},${cy}`;
  const lines = node.label.split('\n');
  return (
    <g
      transform={`translate(${node.x - w / 2}, ${node.y})`}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      <polygon
        points={points}
        fill="var(--card-hover)"
        stroke={hovered ? 'var(--accent)' : 'var(--border)'}
        strokeWidth={hovered ? 2 : 1.5}
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={cx}
          y={cy + (i - (lines.length - 1) / 2) * 14}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={11}
          fontWeight={600}
          fill="var(--fg)"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function ResultNode({ node, hovered, onHover }: { node: FlowchartNode; hovered: boolean; onHover: (id: string | null) => void }) {
  const w = NODE_W;
  const h = NODE_H_RESULT;
  const lines = node.label.split('\n');
  const color = node.color || '#6b7280';
  return (
    <g
      transform={`translate(${node.x - w / 2}, ${node.y})`}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      <rect
        width={w}
        height={h}
        rx={10}
        fill={color}
        fillOpacity={hovered ? 0.25 : 0.15}
        stroke={color}
        strokeWidth={hovered ? 2 : 1.5}
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={w / 2}
          y={h / 2 + (i - (lines.length - 1) / 2) * 14}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fontWeight={600}
          fill={color}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

// ── Main component ─────────────────────────────────────────────────

export default function FlowchartRenderer({ data }: { data: FlowchartData }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const vb = computeViewBox(data.nodes);

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
          鉴别流程图
        </span>
        <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
          {data.titleZh}
        </span>
      </div>
      <svg
        viewBox={`${vb.minX} ${vb.minY} ${vb.width} ${vb.height}`}
        width={containerWidth > 0 ? Math.min(containerWidth, vb.width) : '100%'}
        style={{
          maxWidth: '100%',
          height: 'auto',
          minHeight: 200,
        }}
        role="img"
        aria-label={data.titleZh}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="var(--fg-muted)" opacity={0.6} />
          </marker>
        </defs>

        {/* Edges first (behind nodes) */}
        {data.edges.map((e, i) => (
          <EdgeLine
            key={`${e.from}-${e.to}-${i}`}
            from={e.from}
            to={e.to}
            label={e.label}
            nodes={data.nodes}
          />
        ))}

        {/* Nodes */}
        {data.nodes.map(n => {
          const isHovered = hovered === n.id;
          const props = { node: n, hovered: isHovered, onHover: setHovered };
          switch (n.type) {
            case 'start': return <StartNode key={n.id} {...props} />;
            case 'decision': return <DecisionNode key={n.id} {...props} />;
            case 'result': return <ResultNode key={n.id} {...props} />;
          }
        })}
      </svg>
    </div>
  );
}
