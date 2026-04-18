/**
 * Tests for the FlowchartRenderer overlap resolution logic.
 * We test the pure function independently.
 */
import { describe, it, expect } from 'vitest';

// Re-implement the logic here to test it independently of React
const NODE_W = 160;
const MIN_GAP = 20;

interface TestNode {
  id: string;
  type: 'start' | 'decision' | 'result';
  x: number;
  y: number;
}

function nodeHalfWidth(type: TestNode['type']): number {
  return type === 'decision' ? NODE_W / 2 + 8 : NODE_W / 2;
}

function resolveOverlaps(nodes: TestNode[]): void {
  const rows = new Map<number, TestNode[]>();
  for (const n of nodes) {
    const row = rows.get(n.y) || [];
    row.push(n);
    rows.set(n.y, row);
  }

  for (const row of rows.values()) {
    if (row.length < 2) continue;
    row.sort((a, b) => a.x - b.x);

    const origCenter = (row[0].x + row[row.length - 1].x) / 2;

    for (let i = 1; i < row.length; i++) {
      const prev = row[i - 1];
      const curr = row[i];
      const minDist = nodeHalfWidth(prev.type) + nodeHalfWidth(curr.type) + MIN_GAP;
      if (curr.x - prev.x < minDist) {
        curr.x = prev.x + minDist;
      }
    }

    const newCenter = (row[0].x + row[row.length - 1].x) / 2;
    const shift = origCenter - newCenter;
    if (Math.abs(shift) > 1) {
      for (const n of row) n.x += shift;
    }
  }
}

function getMinGap(nodes: TestNode[]): number {
  const rows = new Map<number, TestNode[]>();
  for (const n of nodes) {
    const row = rows.get(n.y) || [];
    row.push(n);
    rows.set(n.y, row);
  }
  let minGap = Infinity;
  for (const row of rows.values()) {
    if (row.length < 2) continue;
    row.sort((a, b) => a.x - b.x);
    for (let i = 0; i < row.length - 1; i++) {
      const a = row[i], b = row[i + 1];
      const gap = (b.x - nodeHalfWidth(b.type)) - (a.x + nodeHalfWidth(a.type));
      minGap = Math.min(minGap, gap);
    }
  }
  return minGap;
}

describe('resolveOverlaps', () => {
  it('does nothing when nodes have enough space', () => {
    const nodes: TestNode[] = [
      { id: 'a', type: 'result', x: 0, y: 0 },
      { id: 'b', type: 'result', x: 200, y: 0 },
    ];
    const origB = nodes[1].x;
    resolveOverlaps(nodes);
    expect(nodes[1].x).toBe(origB);
  });

  it('pushes apart overlapping nodes', () => {
    const nodes: TestNode[] = [
      { id: 'a', type: 'result', x: 0, y: 100 },
      { id: 'b', type: 'result', x: 100, y: 100 }, // overlap: needs 180 but only 100 apart
    ];
    resolveOverlaps(nodes);
    const gap = getMinGap(nodes);
    expect(gap).toBeGreaterThanOrEqual(MIN_GAP);
  });

  it('handles three overlapping nodes', () => {
    const nodes: TestNode[] = [
      { id: 'a', type: 'result', x: 0, y: 0 },
      { id: 'b', type: 'result', x: 50, y: 0 },
      { id: 'c', type: 'result', x: 100, y: 0 },
    ];
    resolveOverlaps(nodes);
    const gap = getMinGap(nodes);
    expect(gap).toBeGreaterThanOrEqual(MIN_GAP);
  });

  it('handles diamond (decision) nodes being wider', () => {
    const nodes: TestNode[] = [
      { id: 'a', type: 'decision', x: 0, y: 0 },
      { id: 'b', type: 'result', x: 100, y: 0 },
    ];
    resolveOverlaps(nodes);
    const gap = getMinGap(nodes);
    expect(gap).toBeGreaterThanOrEqual(MIN_GAP);
  });

  it('does not affect nodes on different rows', () => {
    const nodes: TestNode[] = [
      { id: 'a', type: 'result', x: 0, y: 0 },
      { id: 'b', type: 'result', x: 50, y: 100 },
    ];
    resolveOverlaps(nodes);
    // Different rows, no adjustment needed
    expect(nodes[0].x).toBe(0);
    expect(nodes[1].x).toBe(50);
  });

  it('handles single-node rows', () => {
    const nodes: TestNode[] = [
      { id: 'a', type: 'start', x: 400, y: 0 },
    ];
    resolveOverlaps(nodes);
    expect(nodes[0].x).toBe(400);
  });

  it('re-centers adjusted rows around original midpoint', () => {
    // Nodes far enough apart that no push is needed won't trigger re-center
    // Use 3 nodes with moderate overlap so push + re-center both fire
    const nodes: TestNode[] = [
      { id: 'a', type: 'result', x: 100, y: 0 },
      { id: 'b', type: 'result', x: 120, y: 0 },
      { id: 'c', type: 'result', x: 140, y: 0 },
    ];
    const origCenter = (100 + 140) / 2; // 120
    resolveOverlaps(nodes);
    const newCenter = (nodes[0].x + nodes[2].x) / 2;
    // After resolve, all nodes should have MIN_GAP and be approximately centered
    expect(Math.abs(newCenter - origCenter)).toBeLessThan(2);
    // And no overlaps remain
    const gap = getMinGap(nodes);
    expect(gap).toBeGreaterThanOrEqual(MIN_GAP);
  });
});
