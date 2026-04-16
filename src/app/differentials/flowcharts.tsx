'use client';

import { useEffect, useState } from 'react';
import FlowchartRenderer from '@/components/FlowchartRenderer';

interface FlowchartData {
  id: string;
  titleZh: string;
  relatedDifferentialId: string | null;
  nodes: { id: string; type: 'start' | 'decision' | 'result'; label: string; x: number; y: number; color?: string }[];
  edges: { from: string; to: string; label?: string }[];
}

export function DifferentialFlowcharts({ differentialId }: { differentialId: string }) {
  const [charts, setCharts] = useState<FlowchartData[]>([]);

  useEffect(() => {
    fetch('/api/flowcharts')
      .then(r => r.json())
      .then((all: FlowchartData[]) => {
        setCharts(all.filter(c => c.relatedDifferentialId === differentialId));
      })
      .catch(() => {});
  }, [differentialId]);

  if (charts.length === 0) return null;

  return (
    <div className="space-y-4">
      {charts.map(chart => (
        <div key={chart.id} className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <FlowchartRenderer data={chart} />
        </div>
      ))}
    </div>
  );
}
