'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconFlask, IconSearch, IconX, IconBookOpen, IconArrowRight } from '@/components/Icon';
import { OrganIcon } from '@/components/OrganIcon';
import { getMarkerDiagram } from '@/lib/markerDiagrams';

interface Marker {
  id: string; nameZh: string; nameEn: string; abbreviation: string; category: string;
  cloneInfo: string; targetProtein: string; cellularLocalization: string;
  normalExpression: string; function: string; interpretation: string;
  clinicalSignificance: string; positiveIn: string[]; negativeIn: string[];
  relatedDrugs: string[]; pitfalls: string;
  stainingImages?: { id: string; label: string; images: unknown[] }[];
  organs?: string[];
}

interface Organ { id: string; nameZh: string; nameEn: string; color: string }

type PageMode = 'ihc' | 'special-stains';

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

const STAIN_CATEGORIES: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: '多糖染色', label: '多糖' },
  { key: '结缔组织染色', label: '结缔组织' },
  { key: '微生物染色', label: '微生物' },
  { key: '矿物质染色', label: '矿物质' },
  { key: '蛋白质染色', label: '蛋白质' },
  { key: '脂质染色', label: '脂质' },
];

export default function MarkersPage() {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [stains, setStains] = useState<Marker[]>([]);
  const [organs, setOrgans] = useState<Organ[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<PageMode>('ihc');
  const [filter, setFilter] = useState('all');
  const [organFilter, setOrganFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [organExpanded, setOrganExpanded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/markers').then(r => r.json()),
      fetch('/api/organs').then(r => r.json()),
      fetch('/api/special-stains').then(r => r.json()),
    ])
      .then(([m, o, s]) => {
        setMarkers(Array.isArray(m) ? m : []);
        setOrgans(Array.isArray(o) ? o : []);
        setStains(Array.isArray(s) ? s : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const activeItems = mode === 'ihc' ? markers : stains;
  const activeCategories = mode === 'ihc' ? CATEGORIES : STAIN_CATEGORIES;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeItems.filter(m => {
      if (filter !== 'all' && m.category !== filter) return false;
      if (mode === 'ihc' && organFilter !== 'all' && !(m.organs || []).includes(organFilter)) return false;
      if (!q) return true;
      return (
        m.nameZh.includes(q) ||
        m.nameEn.toLowerCase().includes(q) ||
        m.abbreviation.toLowerCase().includes(q) ||
        (m.targetProtein || '').toLowerCase().includes(q) ||
        m.positiveIn.some(p => p.toLowerCase().includes(q))
      );
    });
  }, [activeItems, filter, organFilter, search, mode]);

  // Category counts that honor the organ filter + search chain so chip
  // counts stay in sync with the visible results.
  const counts = useMemo(() => {
    const base = activeItems.filter(m => {
      if (mode === 'ihc' && organFilter !== 'all' && !(m.organs || []).includes(organFilter)) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return m.nameZh.includes(q) || m.nameEn.toLowerCase().includes(q) || m.abbreviation.toLowerCase().includes(q);
    });
    const map: Record<string, number> = { all: base.length };
    for (const m of base) map[m.category] = (map[m.category] || 0) + 1;
    return map;
  }, [activeItems, search, organFilter, mode]);

  const organCounts = useMemo(() => {
    const base = activeItems.filter(m => {
      if (filter !== 'all' && m.category !== filter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return m.nameZh.includes(q) || m.nameEn.toLowerCase().includes(q) || m.abbreviation.toLowerCase().includes(q);
    });
    const map: Record<string, number> = { all: base.length };
    for (const m of base) for (const o of m.organs || []) map[o] = (map[o] || 0) + 1;
    return map;
  }, [activeItems, filter, search]);

  // Preserve the grouped-by-category layout so the catalog still reads like
  // a reference index; each group renders as a responsive card grid.
  const groups = useMemo(() => {
    const byCat: Record<string, Marker[]> = {};
    for (const m of filtered) {
      const cat = m.category || '其他';
      (byCat[cat] ||= []).push(m);
    }
    return activeCategories
      .map(c => c.key)
      .filter(k => k !== 'all' && byCat[k]?.length)
      .map(k => ({ key: k, label: activeCategories.find(c => c.key === k)!.label, items: byCat[k] }));
  }, [filtered, activeCategories]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          <IconFlask size={24} style={{ color: '#22c55e' }} />
          <span>{mode === 'ihc' ? '免疫组化标记物' : '特殊染色'}目录</span>
        </h1>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          {mode === 'ihc'
            ? `${markers.length} 个常用标记物 · 点击卡片查看详情`
            : `${stains.length} 种特殊染色方法 · 点击卡片查看详情`
          }
        </p>
      </div>

      {/* Mode toggle: IHC / Special Stains */}
      <div className="flex gap-1 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        {([['ihc', '免疫组化'], ['special-stains', '特殊染色']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setMode(key); setFilter('all'); setOrganFilter('all'); setSearch(''); setOrganExpanded(false); }}
            className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderBottomColor: mode === key ? 'var(--accent)' : 'transparent',
              color: mode === key ? 'var(--fg)' : 'var(--fg-muted)',
            }}
          >
            {label}
            <span className="ml-1.5 text-xs tabular-nums" style={{ opacity: 0.6 }}>
              {key === 'ihc' ? markers.length : stains.length}
            </span>
          </button>
        ))}
      </div>

      {/* Sticky search + filters */}
      <div
        className="sticky top-16 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-4 mb-6"
        style={{
          background: 'linear-gradient(to bottom, var(--bg) 75%, transparent)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 max-w-md">
            <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }}>
              <IconSearch size={16} />
            </div>
            <input
              type="text"
              placeholder={mode === 'ihc' ? '搜索：CK7 / 雌激素受体 / 乳腺癌…' : '搜索：PAS / Masson / 刚果红 / 纤维化…'}
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
        </div>

        {/* Category chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mt-3 -mx-1 px-1">
          {activeCategories.map(c => {
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

        {/* Organ filter (only for IHC mode, collapsed by default) */}
        {mode === 'ihc' && organs.length > 0 && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setOrganExpanded(v => !v)}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: organFilter !== 'all' ? 'var(--accent)' : 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span>按器官筛选{organFilter !== 'all' ? `：${organs.find(o => o.id === organFilter)?.nameZh || ''}` : ''}</span>
              <span style={{ transform: organExpanded ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {organFilter !== 'all' && (
              <button
                onClick={() => setOrganFilter('all')}
                className="text-xs underline"
                style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                清除
              </button>
            )}
          </div>
        )}
        {mode === 'ihc' && organExpanded && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 mt-2 -mx-1 px-1">
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
            onClick={() => { setSearch(''); setFilter('all'); setOrganFilter('all'); }}
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
        {m.stainingImages && m.stainingImages.length > 0 && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
            title={`包含 ${m.stainingImages.length} 组染色形态图`}
          >
            <IconFlask size={9} />
            染色图 {m.stainingImages.length} 组
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
