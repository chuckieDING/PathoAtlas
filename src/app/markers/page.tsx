'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconFlask, IconSearch, IconX, IconBookOpen, IconArrowRight } from '@/components/Icon';
import { OrganIcon } from '@/components/OrganIcon';
import { getMarkerDiagram, MARKERS_WITH_DIAGRAM } from '@/lib/markerDiagrams';

interface Marker {
  id: string; nameZh: string; nameEn: string; abbreviation: string; category: string;
  cloneInfo: string; targetProtein: string; cellularLocalization: string;
  normalExpression: string; function: string; interpretation: string;
  clinicalSignificance: string; positiveIn: string[]; negativeIn: string[];
  relatedDrugs: string[]; pitfalls: string;
  organs?: string[];
}

interface Organ { id: string; nameZh: string; nameEn: string; color: string }

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
  const [organs, setOrgans] = useState<Organ[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [organFilter, setOrganFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [onlyWithDiagram, setOnlyWithDiagram] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/markers').then(r => r.json()),
      fetch('/api/organs').then(r => r.json()),
    ])
      .then(([m, o]) => {
        setMarkers(Array.isArray(m) ? m : []);
        setOrgans(Array.isArray(o) ? o : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return markers.filter(m => {
      if (filter !== 'all' && m.category !== filter) return false;
      if (organFilter !== 'all' && !(m.organs || []).includes(organFilter)) return false;
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
  }, [markers, filter, organFilter, search, onlyWithDiagram]);

  // Category counts that honor the organ filter + search chain so chip
  // counts stay in sync with the visible results.
  const counts = useMemo(() => {
    const base = markers.filter(m => {
      if (organFilter !== 'all' && !(m.organs || []).includes(organFilter)) return false;
      if (onlyWithDiagram && !getMarkerDiagram(m.id)) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return m.nameZh.includes(q) || m.nameEn.toLowerCase().includes(q) || m.abbreviation.toLowerCase().includes(q);
    });
    const map: Record<string, number> = { all: base.length };
    for (const m of base) map[m.category] = (map[m.category] || 0) + 1;
    return map;
  }, [markers, search, organFilter, onlyWithDiagram]);

  const organCounts = useMemo(() => {
    const base = markers.filter(m => {
      if (filter !== 'all' && m.category !== filter) return false;
      if (onlyWithDiagram && !getMarkerDiagram(m.id)) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return m.nameZh.includes(q) || m.nameEn.toLowerCase().includes(q) || m.abbreviation.toLowerCase().includes(q);
    });
    const map: Record<string, number> = { all: base.length };
    for (const m of base) for (const o of m.organs || []) map[o] = (map[o] || 0) + 1;
    return map;
  }, [markers, filter, search, onlyWithDiagram]);

  // Preserve the grouped-by-category layout so the catalog still reads like
  // a reference index; each group renders as a responsive card grid.
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
          <span>免疫组化标记物目录</span>
        </h1>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          {markers.length} 个常用标记物 · <span style={{ color: 'var(--accent)' }}>{MARKERS_WITH_DIAGRAM}</span> 个附机制概念图 · 点击卡片查看详情
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

        {/* Category chips */}
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

        {/* Organ chips */}
        {organs.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 mt-2 -mx-1 px-1 items-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 pl-1 pr-1" style={{ color: 'var(--fg-muted)' }}>
              器官
            </span>
            <button
              onClick={() => setOrganFilter('all')}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex-shrink-0 flex items-center gap-1.5"
              style={{
                background: organFilter === 'all' ? 'var(--accent)' : 'var(--card)',
                color: organFilter === 'all' ? '#fff' : 'var(--fg-muted)',
                border: `1px solid ${organFilter === 'all' ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              <span>全部</span>
              <span
                className="tabular-nums text-[10px] px-1.5 py-px rounded-full"
                style={{
                  background: organFilter === 'all' ? 'rgba(255,255,255,0.22)' : 'var(--card-hover)',
                  color: organFilter === 'all' ? '#fff' : 'var(--fg-muted)',
                }}
              >
                {organCounts.all || 0}
              </span>
            </button>
            {organs.map(o => {
              const n = organCounts[o.id] || 0;
              const active = organFilter === o.id;
              const disabled = n === 0;
              return (
                <button
                  key={o.id}
                  onClick={() => !disabled && setOrganFilter(o.id)}
                  disabled={disabled}
                  title={o.nameEn}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex-shrink-0 flex items-center gap-1.5"
                  style={{
                    background: active ? o.color : 'var(--card)',
                    color: active ? '#fff' : 'var(--fg-muted)',
                    border: `1px solid ${active ? o.color : 'var(--border)'}`,
                    opacity: disabled ? 0.35 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  <OrganIcon organId={o.id} size={12} color={active ? '#fff' : o.color} />
                  <span>{o.nameZh}</span>
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
        )}
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
            onClick={() => { setSearch(''); setFilter('all'); setOrganFilter('all'); setOnlyWithDiagram(false); }}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {g.items.map(m => (
                <MarkerCatalogCard key={m.id} marker={m} organs={organs} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────

function MarkerCatalogCard({ marker: m, organs }: { marker: Marker; organs: Organ[] }) {
  const diagram = getMarkerDiagram(m.id);
  const markerOrgans = (m.organs || [])
    .map(oid => organs.find(o => o.id === oid))
    .filter((o): o is Organ => !!o);

  return (
    <Link
      href={`/markers/${m.id}`}
      className="group rounded-xl border p-4 transition-all hover:shadow-md block"
      style={{
        background: 'var(--card)',
        borderColor: 'var(--border)',
        textDecoration: 'none',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-2 min-w-0 flex-1">
          <span
            className="font-mono font-bold text-sm flex-shrink-0"
            style={{ color: 'var(--accent)' }}
          >
            {m.abbreviation || m.nameEn}
          </span>
          <span className="text-sm truncate" style={{ color: 'var(--fg)' }}>{m.nameZh}</span>
        </div>
        <IconArrowRight
          size={14}
          className="flex-shrink-0 transition-transform group-hover:translate-x-0.5"
          style={{ color: 'var(--fg-muted)' }}
        />
      </div>

      <div className="text-[11px] mb-2 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>
        {m.targetProtein || m.function}
      </div>

      <div className="flex flex-wrap gap-1">
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}
        >
          {m.cellularLocalization}
        </span>
        {diagram && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}
          >
            <IconBookOpen size={9} />
            机制图
          </span>
        )}
        {markerOrgans.slice(0, 3).map(o => (
          <span
            key={o.id}
            className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}
          >
            <OrganIcon organId={o.id} size={9} color={o.color} />
            {o.nameZh}
          </span>
        ))}
        {markerOrgans.length > 3 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}>
            +{markerOrgans.length - 3}
          </span>
        )}
      </div>
    </Link>
  );
}
