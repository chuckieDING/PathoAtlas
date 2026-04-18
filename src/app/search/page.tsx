'use client';

import { useEffect, useMemo, useState, ComponentType, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  IconMicroscope, IconFlask, IconScale, IconSearch, IconX,
  IconBookOpen, IconActivity, IconSnowflake, IconScissors, IconDna,
  IconBrain, IconFileText,
} from '@/components/Icon';

type SearchType =
  | 'disease' | 'marker' | 'differential' | 'glossary' | 'case'
  | 'staging' | 'cytology' | 'frozen' | 'grossing' | 'molecular' | 'special-stain';

interface SearchResult {
  type: SearchType;
  id: string;
  title: string;
  subtitle: string;
  snippet?: string;
  organ?: string;
  url: string;
  score: number;
}

const TYPE_META: Record<SearchType, { label: string; Icon: ComponentType<{ size?: number }>; color: string }> = {
  disease:        { label: '疾病',       Icon: IconMicroscope, color: '#6366f1' },
  marker:         { label: '标记物',     Icon: IconFlask,      color: '#22c55e' },
  'special-stain':{ label: '特殊染色',   Icon: IconFlask,      color: '#14b8a6' },
  differential:   { label: '鉴别诊断',   Icon: IconScale,      color: '#f59e0b' },
  staging:        { label: '分级分期',   Icon: IconActivity,   color: '#eab308' },
  molecular:      { label: '分子病理',   Icon: IconDna,        color: '#8b5cf6' },
  cytology:       { label: '细胞病理',   Icon: IconBookOpen,   color: '#06b6d4' },
  frozen:         { label: '冰冻切片',   Icon: IconSnowflake,  color: '#3b82f6' },
  grossing:       { label: '取材规范',   Icon: IconScissors,   color: '#14b8a6' },
  case:           { label: '虚拟病例',   Icon: IconFileText,   color: '#ef4444' },
  glossary:       { label: '术语',       Icon: IconBrain,      color: '#f59e0b' },
};

const ALL_TYPES: SearchType[] = ['disease', 'marker', 'differential', 'staging', 'molecular', 'glossary', 'case', 'cytology', 'frozen', 'grossing', 'special-stain'];

// Highlight matched substring in title/subtitle
function highlight(text: string, query: string, color: string): React.ReactNode {
  if (!text || !query) return text;
  const lt = text.toLowerCase();
  const lq = query.toLowerCase();
  const idx = lt.indexOf(lq);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: `${color}33`, color, padding: '0 2px', borderRadius: 2 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(q);
  const [activeTypes, setActiveTypes] = useState<Set<SearchType>>(new Set());
  const [organFilter, setOrganFilter] = useState('');

  // Debounced search as user types
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) { setResults([]); return; }
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then(r => r.json())
        .then((d: SearchResult[]) => { setResults(Array.isArray(d) ? d : []); setLoading(false); })
        .catch(() => setLoading(false));
      // Update URL without full navigation
      const params = new URLSearchParams(window.location.search);
      params.set('q', trimmed);
      window.history.replaceState({}, '', `/search?${params.toString()}`);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Counts by type (based on raw results, before filters)
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of results) counts[r.type] = (counts[r.type] || 0) + 1;
    return counts;
  }, [results]);

  // Available organs from results (for filter)
  const availableOrgans = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) if (r.organ) set.add(r.organ);
    return Array.from(set).sort();
  }, [results]);

  // Apply type + organ filters
  const filtered = useMemo(() => {
    return results.filter(r => {
      if (activeTypes.size > 0 && !activeTypes.has(r.type)) return false;
      if (organFilter && r.organ !== organFilter) return false;
      return true;
    });
  }, [results, activeTypes, organFilter]);

  const toggleType = (t: SearchType) => {
    const next = new Set(activeTypes);
    if (next.has(t)) next.delete(t); else next.add(t);
    setActiveTypes(next);
  };

  const clearFilters = () => { setActiveTypes(new Set()); setOrganFilter(''); };
  const hasFilters = activeTypes.size > 0 || !!organFilter;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--fg)' }}>搜索</h1>

      {/* Search bar */}
      <div className="relative mb-4">
        <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }}>
          <IconSearch size={18} />
        </div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="输入关键词搜索疾病、标记物、鉴别诊断、分子、术语..."
          autoFocus
          className="w-full pl-12 pr-10 py-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md cursor-pointer"
            style={{ color: 'var(--fg-muted)' }}
            aria-label="清除"
          >
            <IconX size={16} />
          </button>
        )}
      </div>

      {/* Type filter chips */}
      {results.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          <button
            onClick={() => setActiveTypes(new Set())}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer"
            style={{
              background: activeTypes.size === 0 ? 'var(--accent)' : 'var(--card)',
              color: activeTypes.size === 0 ? '#fff' : 'var(--fg-muted)',
              border: `1px solid ${activeTypes.size === 0 ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            全部 <span className="tabular-nums opacity-70 ml-1">{results.length}</span>
          </button>
          {ALL_TYPES.filter(t => typeCounts[t] > 0).map(t => {
            const meta = TYPE_META[t];
            const active = activeTypes.has(t);
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                style={{
                  background: active ? meta.color : 'var(--card)',
                  color: active ? '#fff' : 'var(--fg-muted)',
                  border: `1px solid ${active ? meta.color : 'var(--border)'}`,
                }}
              >
                <meta.Icon size={11} />
                <span>{meta.label}</span>
                <span className="tabular-nums opacity-70">{typeCounts[t]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Organ filter */}
      {availableOrgans.length > 0 && (
        <div className="flex gap-2 items-center flex-wrap mb-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>器官</span>
          <button
            onClick={() => setOrganFilter('')}
            className="text-[11px] px-2 py-0.5 rounded-full cursor-pointer"
            style={{
              background: !organFilter ? 'var(--accent)' : 'var(--card)',
              color: !organFilter ? '#fff' : 'var(--fg-muted)',
              border: `1px solid ${!organFilter ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            全部
          </button>
          {availableOrgans.map(o => (
            <button
              key={o}
              onClick={() => setOrganFilter(o)}
              className="text-[11px] px-2 py-0.5 rounded-full cursor-pointer"
              style={{
                background: organFilter === o ? 'var(--accent)' : 'var(--card)',
                color: organFilter === o ? '#fff' : 'var(--fg-muted)',
                border: `1px solid ${organFilter === o ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}

      {/* Clear filters */}
      {hasFilters && (
        <div className="mb-3">
          <button onClick={clearFilters} className="text-xs underline cursor-pointer" style={{ color: 'var(--accent)' }}>
            清除所有筛选
          </button>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-pulse" style={{ color: 'var(--fg-muted)' }}>搜索中...</div>
        </div>
      ) : !query.trim() ? (
        <div className="text-center py-16" style={{ color: 'var(--fg-muted)' }}>
          <div className="flex justify-center mb-3"><IconSearch size={36} /></div>
          <p className="text-sm">输入关键词开始搜索</p>
          <p className="text-xs mt-2 opacity-70">可搜索：疾病、标记物、鉴别诊断、分期系统、分子标志物、术语、病例等</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--fg-muted)' }}>
          <div className="flex justify-center mb-3"><IconSearch size={36} /></div>
          <p>未找到 &ldquo;{query}&rdquo; 相关结果</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--fg-muted)' }}>
          <p className="text-sm">当前筛选条件无匹配结果</p>
          <button onClick={clearFilters} className="text-xs underline mt-2 cursor-pointer" style={{ color: 'var(--accent)' }}>
            清除筛选
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
            显示 {filtered.length} / {results.length} 个结果
          </p>
          {filtered.map((r) => {
            const meta = TYPE_META[r.type];
            return (
              <Link
                key={`${r.type}-${r.id}`}
                href={r.url}
                className="flex items-start gap-3 rounded-xl px-4 py-3 transition-all hover:shadow-md"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', textDecoration: 'none' }}
              >
                <div className="rounded-lg p-2 flex-shrink-0 mt-0.5" style={{ background: meta.color + '18', color: meta.color }}>
                  <meta.Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium text-sm" style={{ color: 'var(--fg)' }}>
                      {highlight(r.title, query, meta.color)}
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: meta.color + '18', color: meta.color }}>
                      {meta.label}
                    </span>
                    {r.organ && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}>
                        {r.organ}
                      </span>
                    )}
                  </div>
                  {r.subtitle && (
                    <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                      {highlight(r.subtitle, query, meta.color)}
                    </div>
                  )}
                  {r.snippet && (
                    <div className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--fg-muted)', opacity: 0.85 }}>
                      {highlight(r.snippet, query, meta.color)}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><div className="animate-pulse" style={{ color: 'var(--fg-muted)' }}>加载中...</div></div>}>
      <SearchContent />
    </Suspense>
  );
}
