'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconBookOpen, IconSearch } from '@/components/Icon';
import EnhancementImageGallery from '@/components/EnhancementImageGallery';

interface CytologyCategory {
  id: string;
  nameZh: string;
  nameEn: string;
  criteria: string;
  malignancyRisk: string;
  management: string;
  notes: string;
}

interface CnConsensusItem {
  title: string;
  org: string;
  year?: number;
  summary?: string;
}

interface CytologySystem {
  id: string;
  nameZh: string;
  nameEn: string;
  description: string;
  categories: CytologyCategory[];
  /** Set by enhancement pipeline. Domestic consensus matching this
   *  cytology classification system (e.g., 中国版甲状腺 FNA / 宫颈 TBS 共识). */
  _enhance_cytology_cn_consensus?: { cnConsensus?: CnConsensusItem[] };
  /** Set by enhancement pipeline. Representative cytology images per category.
   *  URLs are placeholders pending real artwork. */
  _enhance_cytology_category_images?: {
    categoryImages?: Array<{ categoryId?: string; url?: string; caption: string }>;
  };
}

export default function CytologyPage() {
  const [systems, setSystems] = useState<CytologySystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/cytology')
      .then(r => r.json())
      .then(data => {
        setSystems(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          setSelectedSystemId(data[0].id);
        }
        setLoading(false);
      })
      .catch(() => {
        setSystems([]);
        setLoading(false);
      });
  }, []);

  const selectedSystem = systems.find(s => s.id === selectedSystemId);

  const filteredCategories = selectedSystem
    ? selectedSystem.categories.filter(c =>
        c.nameZh.toLowerCase().includes(search.toLowerCase()) ||
        c.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        c.criteria.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--fg)' }}>细胞病理学</h1>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              各器官系统的细胞学分类标准。包括诊断标准、恶变风险分层和临床处理建议。
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
            <IconBookOpen size={14} />
            <span>{systems.length} 个分类系统</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse" style={{ color: 'var(--fg-muted)' }}>加载中...</div>
        </div>
      ) : systems.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--fg-muted)' }}>
          <p>暂无细胞病理学数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Systems list sidebar */}
          <aside className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <h2 className="text-xs font-semibold mb-3 uppercase" style={{ color: 'var(--accent)' }}>
              分类系统
            </h2>
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }}>
                <IconSearch size={14} />
              </span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索..."
                aria-label="搜索细胞病理学"
                className="w-full text-xs pl-9 pr-3 py-2 rounded-lg outline-none"
                style={{ background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border)' }}
              />
            </div>
            <ul className="space-y-1">
              {systems.map(sys => (
                <li key={sys.id}>
                  <button
                    onClick={() => {
                      setSelectedSystemId(sys.id);
                      setSearch('');
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-xs transition-colors"
                    style={{
                      background: selectedSystemId === sys.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color: selectedSystemId === sys.id ? 'var(--fg)' : 'var(--fg-muted)',
                      border: selectedSystemId === sys.id ? '1px solid var(--accent)' : '1px solid transparent',
                    }}
                  >
                    <div className="font-medium">{sys.nameZh}</div>
                    <div className="text-[10px] opacity-70">{sys.nameEn}</div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* System details */}
          <main>
            {!selectedSystem ? (
              <div className="rounded-xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--fg-muted)' }}>请从左侧选择一个分类系统</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* System header */}
                <div className="rounded-xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--fg)' }}>
                    {selectedSystem.nameZh}
                  </h2>
                  <p className="text-sm mb-3" style={{ color: 'var(--fg-muted)' }}>
                    {selectedSystem.nameEn}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)', opacity: 0.85 }}>
                    {selectedSystem.description}
                  </p>
                </div>

                {/* Per-category cytology images (enhancement, placeholder URLs) */}
                {selectedSystem._enhance_cytology_category_images?.categoryImages && selectedSystem._enhance_cytology_category_images.categoryImages.length > 0 && (
                  <EnhancementImageGallery
                    title="分类代表图（待补充原图）"
                    items={selectedSystem._enhance_cytology_category_images.categoryImages.map(img => ({
                      url: img.url,
                      caption: img.caption,
                      badge: img.categoryId,
                    }))}
                    accent="#0ea5e9"
                  />
                )}

                {/* China-version consensus matching this system (enhancement) */}
                {selectedSystem._enhance_cytology_cn_consensus?.cnConsensus && selectedSystem._enhance_cytology_cn_consensus.cnConsensus.length > 0 && (
                  <div className="rounded-xl p-5" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#10b981' }}>
                      <span aria-hidden>🇨🇳</span> 国内对应共识/规范
                    </h3>
                    <ul className="space-y-3">
                      {selectedSystem._enhance_cytology_cn_consensus.cnConsensus.map((c, i) => (
                        <li key={i} className="text-sm">
                          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                            <span className="font-medium" style={{ color: 'var(--fg)' }}>{c.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                              {c.org}{c.year ? ` · ${c.year}` : ''}
                            </span>
                          </div>
                          {c.summary && (
                            <p className="leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{c.summary}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Categories list */}
                <div className="space-y-3">
                  {filteredCategories.length === 0 ? (
                    <div className="rounded-xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                      <p style={{ color: 'var(--fg-muted)' }}>无匹配结果</p>
                    </div>
                  ) : (
                    filteredCategories.map((cat, idx) => (
                      <article
                        key={cat.id}
                        className="rounded-xl p-5 space-y-3"
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {/* Category title with risk badge */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1">
                            <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--fg)' }}>
                              {idx + 1}. {cat.nameZh}
                            </h3>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                              {cat.nameEn}
                            </p>
                          </div>
                          {cat.malignancyRisk && (
                            <div
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                              style={{
                                background: cat.malignancyRisk.startsWith('0-3')
                                  ? 'rgba(34,197,94,0.15)'
                                  : cat.malignancyRisk.startsWith('95-100') || cat.malignancyRisk.includes('100%')
                                  ? 'rgba(239,68,68,0.15)'
                                  : 'rgba(245,158,11,0.15)',
                                color: cat.malignancyRisk.startsWith('0-3')
                                  ? '#22c55e'
                                  : cat.malignancyRisk.startsWith('95-100') || cat.malignancyRisk.includes('100%')
                                  ? '#ef4444'
                                  : '#f59e0b',
                              }}
                            >
                              恶变风险: {cat.malignancyRisk}
                            </div>
                          )}
                        </div>

                        {/* Diagnostic criteria */}
                        <div className="rounded-lg p-3" style={{ background: 'var(--card-hover)' }}>
                          <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--accent)' }}>
                            诊断标准
                          </h4>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                            {cat.criteria}
                          </p>
                        </div>

                        {/* Clinical management */}
                        {cat.management && (
                          <div className="rounded-lg p-3" style={{ background: 'var(--card-hover)' }}>
                            <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--accent)' }}>
                              临床处理
                            </h4>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                              {cat.management}
                            </p>
                          </div>
                        )}

                        {/* Notes */}
                        {cat.notes && (
                          <div className="rounded-lg p-3" style={{ background: 'rgba(var(--accent-rgb, 59, 130, 246), 0.1)' }}>
                            <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--accent)' }}>
                              备注
                            </h4>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                              {cat.notes}
                            </p>
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
