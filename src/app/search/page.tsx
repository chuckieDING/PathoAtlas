'use client';

import { useEffect, useState, ComponentType } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { IconMicroscope, IconFlask, IconScale, IconSearch } from '@/components/Icon';

interface SearchResult {
  type: 'disease' | 'marker' | 'differential';
  id: string; title: string; subtitle: string; organ?: string; url: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(q);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`).then(r => r.json()).then(d => { setResults(d); setLoading(false); }).catch(() => setLoading(false));
  }, [q]);

  const typeLabels: Record<string, { label: string; Icon: ComponentType<{ size?: number }>; color: string }> = {
    disease: { label: '疾病', Icon: IconMicroscope, color: '#6366f1' },
    marker: { label: '标记物', Icon: IconFlask, color: '#22c55e' },
    differential: { label: '鉴别诊断', Icon: IconScale, color: '#f59e0b' },
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--fg)' }}>搜索</h1>
      <form action="/search" className="mb-6">
        <input type="text" name="q" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="搜索疾病、标记物、鉴别诊断..." autoFocus
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
      </form>

      {loading ? (
        <div className="text-center py-16"><div className="animate-pulse" style={{ color: 'var(--fg-muted)' }}>搜索中...</div></div>
      ) : q && results.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--fg-muted)' }}>
          <div className="flex justify-center mb-3"><IconSearch size={36} /></div>
          <p>未找到 &ldquo;{q}&rdquo; 相关结果</p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>找到 {results.length} 个结果</p>
          {results.map((r, i) => {
            const t = typeLabels[r.type];
            return (
              <Link key={i} href={r.url} className="flex items-center gap-4 rounded-xl px-5 py-4 transition-all hover:shadow-md"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', textDecoration: 'none' }}>
                <div className="rounded-lg p-2" style={{ background: t.color + '18', color: t.color }}>
                  <t.Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm" style={{ color: 'var(--fg)' }}>{r.title}</div>
                  <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{r.subtitle}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: t.color + '18', color: t.color }}>{t.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<div className="flex items-center justify-center h-96"><div className="animate-pulse" style={{ color: 'var(--fg-muted)' }}>加载中...</div></div>}><SearchContent /></Suspense>;
}
