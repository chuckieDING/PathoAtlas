'use client';

import { useEffect, useState, useRef } from 'react';
import FlowchartRenderer from '@/components/FlowchartRenderer';

interface FlowchartData {
  id: string;
  titleZh: string;
  relatedDifferentialId: string | null;
  nodes: { id: string; type: 'start' | 'decision' | 'result'; label: string; x: number; y: number; color?: string }[];
  edges: { from: string; to: string; label?: string }[];
}

// Shared cache so all DifferentialFlowcharts instances share one fetch
let _cache: FlowchartData[] | null = null;
let _promise: Promise<FlowchartData[]> | null = null;

function fetchFlowcharts(): Promise<FlowchartData[]> {
  if (_cache) return Promise.resolve(_cache);
  if (!_promise) {
    _promise = fetch('/api/flowcharts')
      .then(r => r.json())
      .then((data: FlowchartData[]) => { _cache = data; return data; })
      .catch(() => { _promise = null; return [] as FlowchartData[]; });
  }
  return _promise;
}

export function DifferentialFlowcharts({ differentialId }: { differentialId: string }) {
  const [charts, setCharts] = useState<FlowchartData[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    fetchFlowcharts().then(all => {
      if (mounted.current) {
        setCharts(all.filter(c => c.relatedDifferentialId === differentialId));
      }
    });
    return () => { mounted.current = false; };
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
