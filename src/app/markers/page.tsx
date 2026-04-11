'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Marker {
  id: string; nameZh: string; nameEn: string; abbreviation: string; category: string;
  cloneInfo: string; targetProtein: string; cellularLocalization: string;
  normalExpression: string; function: string; interpretation: string;
  clinicalSignificance: string; positiveIn: string[]; negativeIn: string[];
  relatedDrugs: string[]; pitfalls: string;
}

const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: '上皮标记', label: '上皮' },
  { key: '间叶标记', label: '间叶' },
  { key: '淋巴标记', label: '淋巴' },
  { key: '激素受体', label: '激素' },
  { key: '增殖标记', label: '增殖' },
  { key: '神经标记', label: '神经内分泌' },
  { key: '分子标记', label: '分子' },
  { key: '其他', label: '其他' },
];

export default function MarkersPage() {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/markers').then(r => r.json()).then(d => { setMarkers(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = markers.filter(m => {
    const matchCat = filter === 'all' || m.category === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || m.nameZh.includes(q) || m.nameEn.toLowerCase().includes(q) || m.abbreviation.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // Group by category
  const groups: Record<string, Marker[]> = {};
  for (const m of filtered) {
    const cat = m.category || '其他';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--fg)' }}>🧪 免疫组化标记物数据库</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
        {markers.length} 个常用标记物的详细判读标准与临床应用
      </p>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input type="text" placeholder="搜索标记物..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 max-w-md px-4 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setFilter(c.key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0"
              style={{ background: filter === c.key ? 'var(--accent)' : 'var(--card-hover)', color: filter === c.key ? '#fff' : 'var(--fg-muted)' }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16"><div className="animate-pulse" style={{ color: 'var(--fg-muted)' }}>加载中...</div></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--fg-muted)' }}>未找到匹配的标记物</div>
      ) : (
        Object.entries(groups).map(([cat, items]) => (
          <div key={cat} className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>{cat} ({items.length})</h2>
            <div className="space-y-2">
              {items.map(m => (
                <div key={m.id} id={m.id} className="rounded-xl border transition-all"
                  style={{ background: 'var(--card)', borderColor: expanded === m.id ? 'var(--accent)' : 'var(--border)' }}>
                  {/* Header row */}
                  <button className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
                    onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono font-bold text-sm" style={{ color: 'var(--accent)' }}>{m.abbreviation || m.nameEn}</span>
                      <span className="text-sm truncate" style={{ color: 'var(--fg)' }}>{m.nameZh}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full hidden sm:inline" style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}>{m.cellularLocalization}</span>
                    </div>
                    <svg className="w-4 h-4 flex-shrink-0 transition-transform" style={{ color: 'var(--fg-muted)', transform: expanded === m.id ? 'rotate(180deg)' : 'rotate(0)' }}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>

                  {/* Expanded detail */}
                  {expanded === m.id && (
                    <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoBox label="靶蛋白" value={m.targetProtein} />
                        <InfoBox label="定位" value={m.cellularLocalization} />
                        <InfoBox label="克隆号" value={m.cloneInfo} />
                        <InfoBox label="正常表达" value={m.normalExpression} />
                      </div>
                      <InfoBox label="功能" value={m.function} />
                      <InfoBox label="判读标准" value={m.interpretation} />
                      <InfoBox label="临床意义" value={m.clinicalSignificance} />
                      {m.positiveIn.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--fg-muted)' }}>阳性表达</div>
                          <div className="flex flex-wrap gap-1.5">
                            {m.positiveIn.map(d => <span key={d} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{d}</span>)}
                          </div>
                        </div>
                      )}
                      {m.negativeIn.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--fg-muted)' }}>阴性表达</div>
                          <div className="flex flex-wrap gap-1.5">
                            {m.negativeIn.map(d => <span key={d} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{d}</span>)}
                          </div>
                        </div>
                      )}
                      {m.relatedDrugs.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--fg-muted)' }}>相关靶向药</div>
                          <div className="flex flex-wrap gap-1.5">
                            {m.relatedDrugs.map(d => <span key={d} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{d}</span>)}
                          </div>
                        </div>
                      )}
                      {m.pitfalls && <InfoBox label="诊断陷阱" value={m.pitfalls} />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--card-hover)' }}>
      <div className="text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>{label}</div>
      <div className="text-sm" style={{ color: 'var(--fg)' }}>{value}</div>
    </div>
  );
}
