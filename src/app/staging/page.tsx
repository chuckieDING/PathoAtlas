'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconActivity, IconSearch, IconX } from '@/components/Icon';
import { useDiseaseIndex } from '@/components/useDiseaseIndex';

interface StagingCriterion {
  parameter: string;
  score1?: string;
  score2?: string;
  score3?: string;
  description?: string;
  prognosis?: string;
}

interface StagingGrade {
  grade: string;
  totalScore: string;
  description: string;
}

interface StagingSystem {
  id: string;
  nameZh: string;
  nameEn: string;
  applicableTo: string[];
  description: string;
  criteria: StagingCriterion[];
  grades: StagingGrade[];
}

export default function StagingPage() {
  const [systems, setSystems] = useState<StagingSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const { getName, getHref } = useDiseaseIndex();

  useEffect(() => {
    fetch('/api/staging')
      .then(r => r.json())
      .then(data => { setSystems(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = systems.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.nameZh.includes(q) || s.nameEn.toLowerCase().includes(q) || s.description.includes(q);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          <IconActivity size={24} style={{ color: 'var(--accent)' }} />
          分级分期系统
        </h1>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          {systems.length} 个常用病理分级与分期评分系统
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }}>
          <IconSearch size={16} />
        </div>
        <input
          type="text"
          placeholder="搜索分级分期系统..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md" style={{ color: 'var(--fg-muted)' }}>
            <IconX size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: 'var(--fg-muted)' }}>加载中...</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(sys => {
            const isOpen = expanded === sys.id;
            return (
              <div
                key={sys.id}
                className="rounded-xl border overflow-hidden"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                {/* Header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : sys.id)}
                  className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 cursor-pointer"
                  style={{ background: isOpen ? 'var(--card-hover)' : 'transparent' }}
                >
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>{sys.nameZh}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{sys.nameEn}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{sys.description}</div>
                    {sys.applicableTo.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Array.from(new Set(sys.applicableTo)).map(id => (
                          <span key={id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}>
                            {getName(id)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs flex-shrink-0 mt-1" style={{ color: 'var(--accent)', transform: isOpen ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>
                    ▼
                  </span>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
                    {/* Criteria table */}
                    {sys.criteria.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>评分标准</h3>
                        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                          <table className="w-full text-xs">
                            <thead>
                              <tr style={{ background: 'var(--card-hover)' }}>
                                <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--fg)' }}>参数</th>
                                {sys.criteria[0].score1 !== undefined && (
                                  <>
                                    <th className="text-left px-3 py-2 font-semibold" style={{ color: '#22c55e' }}>1分</th>
                                    <th className="text-left px-3 py-2 font-semibold" style={{ color: '#f59e0b' }}>2分</th>
                                    <th className="text-left px-3 py-2 font-semibold" style={{ color: '#ef4444' }}>3分</th>
                                  </>
                                )}
                                {sys.criteria[0].description !== undefined && (
                                  <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--fg)' }}>描述</th>
                                )}
                                {sys.criteria[0].prognosis !== undefined && (
                                  <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--fg)' }}>预后</th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {sys.criteria.map((c, i) => (
                                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--fg)' }}>{c.parameter}</td>
                                  {c.score1 !== undefined && (
                                    <>
                                      <td className="px-3 py-2" style={{ color: 'var(--fg-muted)' }}>{c.score1}</td>
                                      <td className="px-3 py-2" style={{ color: 'var(--fg-muted)' }}>{c.score2}</td>
                                      <td className="px-3 py-2" style={{ color: 'var(--fg-muted)' }}>{c.score3}</td>
                                    </>
                                  )}
                                  {c.description !== undefined && (
                                    <td className="px-3 py-2" style={{ color: 'var(--fg-muted)' }}>{c.description}</td>
                                  )}
                                  {c.prognosis !== undefined && (
                                    <td className="px-3 py-2" style={{ color: 'var(--fg-muted)' }}>{c.prognosis}</td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Grades */}
                    {sys.grades.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>分级结果</h3>
                        <div className="grid gap-2">
                          {sys.grades.map((g, i) => (
                            <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--card-hover)' }}>
                              <span className="font-mono font-bold text-xs flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }}>{g.grade}</span>
                              <div>
                                <span className="text-xs font-medium" style={{ color: 'var(--fg)' }}>{g.totalScore}</span>
                                <span className="text-xs ml-2" style={{ color: 'var(--fg-muted)' }}>{g.description}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Link to applicable diseases */}
                    {sys.applicableTo.length > 0 && (
                      <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>适用于：</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {Array.from(new Set(sys.applicableTo)).map(id => (
                            <Link
                              key={id}
                              href={getHref(id)}
                              className="text-xs px-2 py-1 rounded-lg transition-colors"
                              style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', textDecoration: 'none' }}
                            >
                              {getName(id)}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
