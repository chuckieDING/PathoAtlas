'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconFlask, IconSearch, IconX, IconBookOpen } from '@/components/Icon';
import { getMarkerDiagram, MARKERS_WITH_DIAGRAM, type MarkerDiagram } from '@/lib/markerDiagrams';

interface Marker {
  id: string; nameZh: string; nameEn: string; abbreviation: string; category: string;
  cloneInfo: string; targetProtein: string; cellularLocalization: string;
  normalExpression: string; function: string; interpretation: string;
  clinicalSignificance: string; positiveIn: string[]; negativeIn: string[];
  relatedDrugs: string[]; pitfalls: string; references?: string[];
}

const CATEGORIES: { key: string; label: string }[] = [
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
  const [onlyWithDiagram, setOnlyWithDiagram] = useState(false);

  useEffect(() => {
    fetch('/api/markers')
      .then(r => r.json())
      .then(d => { setMarkers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // After data loads, auto-expand and scroll to any marker targeted by URL hash
  // so deep links from disease IHC tables and search results land cleanly.
  useEffect(() => {
    if (loading || markers.length === 0) return;
    const hash = typeof window !== 'undefined' ? decodeURIComponent(window.location.hash.slice(1)) : '';
    if (!hash) return;
    const target = markers.find(m => m.id === hash);
    if (target) {
      setExpanded(target.id);
      requestAnimationFrame(() => {
        document.getElementById(target.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [loading, markers]);

  // Press ESC to collapse the currently expanded card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return markers.filter(m => {
      if (filter !== 'all' && m.category !== filter) return false;
      if (onlyWithDiagram && !getMarkerDiagram(m.id)) return false;
      if (!q) return true;
      return (
        m.nameZh.includes(q) ||
        m.nameEn.toLowerCase().includes(q) ||
        m.abbreviation.toLowerCase().includes(q) ||
        (m.targetProtein || '').toLowerCase().includes(q) ||
        m.positiveIn.some(p => p.toLowerCase().includes(q))
      );
    });
  }, [markers, filter, search, onlyWithDiagram]);

  // Category counts (respects the search query so the chips reflect the current
  // result set, not the entire database — matches how users expect filters to feel).
  const counts = useMemo(() => {
    const searchedBase = markers.filter(m => {
      if (onlyWithDiagram && !getMarkerDiagram(m.id)) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        m.nameZh.includes(q) ||
        m.nameEn.toLowerCase().includes(q) ||
        m.abbreviation.toLowerCase().includes(q)
      );
    });
    const map: Record<string, number> = { all: searchedBase.length };
    for (const m of searchedBase) map[m.category] = (map[m.category] || 0) + 1;
    return map;
  }, [markers, search, onlyWithDiagram]);

  // Group filtered results by category, preserving CATEGORIES order.
  const groups = useMemo(() => {
    const byCat: Record<string, Marker[]> = {};
    for (const m of filtered) {
      const cat = m.category || '其他';
      (byCat[cat] ||= []).push(m);
    }
    return CATEGORIES
      .map(c => c.key)
      .filter(k => k !== 'all' && byCat[k]?.length)
      .map(k => ({ key: k, label: CATEGORIES.find(c => c.key === k)!.label, items: byCat[k] }));
  }, [filtered]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          <IconFlask size={24} style={{ color: '#22c55e' }} />
          <span>免疫组化标记物数据库</span>
        </h1>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          {markers.length} 个常用标记物 · <span style={{ color: 'var(--accent)' }}>{MARKERS_WITH_DIAGRAM}</span> 个附机制概念图 · 点击展开查看判读/克隆号/靶向药
        </p>
      </div>

      {/* Sticky search + filters */}
      <div
        className="sticky top-16 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-4 mb-6"
        style={{
          background: 'linear-gradient(to bottom, var(--bg) 75%, transparent)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }}>
              <IconSearch size={16} />
            </div>
            <input
              type="text"
              placeholder="搜索：CK7 / 雌激素受体 / 乳腺癌…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md"
                style={{ color: 'var(--fg-muted)' }}
                aria-label="清除搜索"
              >
                <IconX size={14} />
              </button>
            )}
          </div>

          {/* Diagram-only toggle */}
          <button
            onClick={() => setOnlyWithDiagram(v => !v)}
            className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
            style={{
              background: onlyWithDiagram ? 'var(--accent)' : 'var(--card)',
              color: onlyWithDiagram ? '#fff' : 'var(--fg-muted)',
              border: '1px solid var(--border)',
            }}
            aria-pressed={onlyWithDiagram}
          >
            <IconBookOpen size={14} />
            <span>仅看带机制图</span>
          </button>
        </div>

        {/* Category chips with counts */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mt-3 -mx-1 px-1">
          {CATEGORIES.map(c => {
            const n = counts[c.key] || 0;
            const active = filter === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                disabled={n === 0 && c.key !== 'all'}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 flex items-center gap-1.5"
                style={{
                  background: active ? 'var(--accent)' : 'var(--card)',
                  color: active ? '#fff' : 'var(--fg-muted)',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  opacity: n === 0 && c.key !== 'all' ? 0.35 : 1,
                  cursor: n === 0 && c.key !== 'all' ? 'not-allowed' : 'pointer',
                }}
              >
                <span>{c.label}</span>
                <span
                  className="tabular-nums text-[10px] px-1.5 py-px rounded-full"
                  style={{
                    background: active ? 'rgba(255,255,255,0.22)' : 'var(--card-hover)',
                    color: active ? '#fff' : 'var(--fg-muted)',
                  }}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-pulse" style={{ color: 'var(--fg-muted)' }}>加载中...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-xl" style={{ background: 'var(--card)', border: '1px dashed var(--border)' }}>
          <div className="flex justify-center mb-3" style={{ color: 'var(--fg-muted)' }}>
            <IconSearch size={32} />
          </div>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>未找到匹配的标记物</p>
          <button
            onClick={() => { setSearch(''); setFilter('all'); setOnlyWithDiagram(false); }}
            className="mt-4 text-xs underline"
            style={{ color: 'var(--accent)' }}
          >
            重置筛选
          </button>
        </div>
      ) : (
        groups.map(g => (
          <section key={g.key} className="mb-8">
            <h2
              className="text-xs font-semibold uppercase tracking-[0.12em] mb-3 flex items-center gap-2"
              style={{ color: 'var(--fg-muted)' }}
            >
              <span>{g.label}</span>
              <span className="tabular-nums">({g.items.length})</span>
              <span className="flex-1 h-px ml-2" style={{ background: 'var(--border)' }} />
            </h2>
            <div className="space-y-2">
              {g.items.map(m => (
                <MarkerCard
                  key={m.id}
                  marker={m}
                  expanded={expanded === m.id}
                  onToggle={() => setExpanded(prev => prev === m.id ? null : m.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────

function MarkerCard({ marker: m, expanded, onToggle }: { marker: Marker; expanded: boolean; onToggle: () => void }) {
  const diagram = getMarkerDiagram(m.id);

  return (
    <div
      id={m.id}
      className="rounded-xl border transition-all"
      style={{
        background: 'var(--card)',
        borderColor: expanded ? 'var(--accent)' : 'var(--border)',
        scrollMarginTop: '128px',
        boxShadow: expanded ? '0 2px 14px rgba(99,102,241,0.12)' : 'none',
      }}
    >
      <button
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className="font-mono font-bold text-sm flex-shrink-0"
            style={{ color: 'var(--accent)' }}
          >
            {m.abbreviation || m.nameEn}
          </span>
          <span className="text-sm truncate" style={{ color: 'var(--fg)' }}>{m.nameZh}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full hidden sm:inline flex-shrink-0"
            style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}
          >
            {m.cellularLocalization}
          </span>
          {diagram && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}
              title="包含机制概念图"
            >
              <IconBookOpen size={10} />
              <span className="hidden sm:inline">机制图</span>
            </span>
          )}
        </div>
        <svg
          className="w-4 h-4 flex-shrink-0 transition-transform"
          style={{ color: 'var(--fg-muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
          {diagram && <MechanismFigure diagram={diagram} />}

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoBox label="靶蛋白" value={m.targetProtein} />
            <InfoBox label="亚细胞定位" value={m.cellularLocalization} />
            <InfoBox label="克隆号" value={m.cloneInfo} mono />
            <InfoBox label="正常表达" value={m.normalExpression} />
          </div>

          <InfoBox label="功能" value={m.function} />
          <InfoBox label="判读标准" value={m.interpretation} />
          <InfoBox label="临床意义" value={m.clinicalSignificance} />

          {m.positiveIn.length > 0 && (
            <TagRow
              label="阳性表达"
              items={m.positiveIn}
              bg="rgba(34,197,94,0.1)"
              color="#22c55e"
            />
          )}
          {m.negativeIn.length > 0 && (
            <TagRow
              label="阴性表达"
              items={m.negativeIn}
              bg="rgba(239,68,68,0.1)"
              color="#ef4444"
            />
          )}
          {m.relatedDrugs.length > 0 && (
            <TagRow
              label="相关靶向药"
              items={m.relatedDrugs}
              bg="rgba(99,102,241,0.12)"
              color="#818cf8"
            />
          )}
          {m.pitfalls && <InfoBox label="诊断陷阱" value={m.pitfalls} accent />}

          {m.references && m.references.length > 0 && (
            <div className="rounded-lg p-3 mt-1" style={{ background: 'var(--card-hover)' }}>
              <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--fg-muted)' }}>参考文献</div>
              <ul className="space-y-1">
                {m.references.map((r, i) => (
                  <li key={i} className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>• {r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function MechanismFigure({ diagram }: { diagram: MarkerDiagram }) {
  return (
    <figure
      className="rounded-xl overflow-hidden mt-4 animate-scale-in"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
    >
      <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--card-hover)' }}>
        <IconBookOpen size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>机制概念图 · {diagram.title}</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={diagram.url}
        alt={diagram.title}
        className="w-full block"
        style={{ maxHeight: '340px', objectFit: 'contain' }}
        loading="lazy"
      />
      <figcaption className="px-4 py-2.5 text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
        {diagram.caption}
      </figcaption>
    </figure>
  );
}

function InfoBox({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  if (!value) return null;
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: accent ? 'rgba(245,158,11,0.08)' : 'var(--card-hover)',
        border: accent ? '1px solid rgba(245,158,11,0.2)' : 'none',
      }}
    >
      <div className="text-xs font-semibold mb-1" style={{ color: accent ? '#f59e0b' : 'var(--fg-muted)' }}>{label}</div>
      <div
        className={`text-sm ${mono ? 'font-mono' : ''}`}
        style={{ color: 'var(--fg)' }}
      >
        {value}
      </div>
    </div>
  );
}

function TagRow({ label, items, bg, color }: { label: string; items: string[]; bg: string; color: string }) {
  return (
    <div>
      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--fg-muted)' }}>{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(d => (
          <span key={d} className="text-xs px-2 py-0.5 rounded-full" style={{ background: bg, color }}>
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}
