'use client';

import { useEffect, useState, useMemo } from 'react';
import { IconSnowflake, IconSearch } from '@/components/Icon';
import EnhancementImageGallery from '@/components/EnhancementImageGallery';

interface FrozenSection {
  id: string;
  nameZh: string;
  nameEn: string;
  indication: string;
  clinicalScenario: string;
  intraoperativeApproach: string[];
  diagnosticTrap?: string[];
  diagnosticTraps?: string[];
  typicalErrors?: string[];
  commonErrors?: string[];
  reportingTemplate: string;
  /** Set by enhancement pipeline. Pitfall/trap images keyed by trap type
   *  + a brief 国内快速冰冻共识 note. URLs are placeholders pending real
   *  artwork. */
  _enhance_frozen_pitfall_image?: {
    pitfallImages?: Array<{
      url?: string;
      caption: string;
      trapType?: 'false-positive' | 'false-negative' | 'artifact';
    }>;
    cnConsensusNote?: string;
  };
}

export default function FrozenSectionPage() {
  const [sections, setSections] = useState<FrozenSection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/frozen');
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];
        setSections(items);
        if (items.length > 0) {
          setSelectedId(data[0].id);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredSections = useMemo(() => {
    return sections.filter(s =>
      s.nameZh.toLowerCase().includes(search.toLowerCase()) ||
      s.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      s.indication.toLowerCase().includes(search.toLowerCase())
    );
  }, [sections, search]);

  const selectedSection = sections.find(s => s.id === selectedId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-pulse" style={{ color: 'var(--fg-muted)' }}>加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <IconSnowflake size={32} style={{ color: 'var(--accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--fg)' }}>术中冰冻切片</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>术中冰冻切片快速诊断咨询</p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Left Sidebar */}
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }}>
                <IconSearch size={14} />
              </span>
              <input
                type="text"
                placeholder="搜索..."
                aria-label="搜索冰冻切片"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-lg outline-none"
                style={{ background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)' }}
              />
            </div>

            {/* Sections List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredSections.map((section) => {
                const active = selectedId === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setSelectedId(section.id)}
                    className="w-full text-left px-4 py-3 rounded-lg transition-colors"
                    style={{
                      background: active ? 'rgba(99,102,241,0.15)' : 'var(--card)',
                      color: active ? 'var(--fg)' : 'var(--fg-muted)',
                      border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                    }}
                  >
                    <div className="font-semibold text-sm">{section.nameZh}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)', opacity: active ? 0.85 : 0.7 }}>
                      {section.nameEn}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Content */}
          <div className="space-y-6">
            {selectedSection ? (
              <>
                {/* Title */}
                <div className="pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--fg)' }}>{selectedSection.nameZh}</h2>
                  <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{selectedSection.nameEn}</p>
                </div>

                {/* Indication */}
                <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <h3 className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                    适应证
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{selectedSection.indication}</p>
                </div>

                {/* Clinical Scenario */}
                <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <h3 className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                    临床情景
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{selectedSection.clinicalScenario}</p>
                </div>

                {/* Intraoperative Approach */}
                <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#22c55e' }}>
                    术中处理方案
                  </h3>
                  <ul className="space-y-2">
                    {selectedSection.intraoperativeApproach.map((item, idx) => (
                      <li key={idx} className="text-sm leading-relaxed pl-4" style={{ color: 'var(--fg-muted)', borderLeft: '2px solid rgba(34,197,94,0.3)' }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Diagnostic Trap */}
                <div className="rounded-xl p-5" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#ef4444' }}>
                    诊断陷阱
                  </h3>
                  <ul className="space-y-2">
                    {(selectedSection.diagnosticTraps || selectedSection.diagnosticTrap || []).map((item, idx) => (
                      <li key={idx} className="text-sm leading-relaxed pl-4" style={{ color: 'var(--fg)', borderLeft: '2px solid rgba(239,68,68,0.4)' }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Typical Errors */}
                <div className="rounded-xl p-5" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#f59e0b' }}>
                    常见错误
                  </h3>
                  <ul className="space-y-2">
                    {(selectedSection.commonErrors || selectedSection.typicalErrors || []).map((item, idx) => (
                      <li key={idx} className="text-sm leading-relaxed pl-4" style={{ color: 'var(--fg)', borderLeft: '2px solid rgba(245,158,11,0.4)' }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Reporting Template */}
                <div className="rounded-xl p-5" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                    报告模板
                  </h3>
                  <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed p-3 rounded-lg" style={{ background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)' }}>
                    {selectedSection.reportingTemplate}
                  </pre>
                </div>

                {/* Pitfall image gallery + China consensus note (enhancement) */}
                {selectedSection._enhance_frozen_pitfall_image?.pitfallImages && selectedSection._enhance_frozen_pitfall_image.pitfallImages.length > 0 && (
                  <EnhancementImageGallery
                    title="冰冻陷阱 / 假阳 / 假阴示例"
                    items={selectedSection._enhance_frozen_pitfall_image.pitfallImages.map(img => ({
                      url: img.url,
                      caption: img.caption,
                      badge: img.trapType,
                    }))}
                    accent="#f59e0b"
                  />
                )}
                {selectedSection._enhance_frozen_pitfall_image?.cnConsensusNote && (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <h4 className="font-semibold text-xs mb-2 flex items-center gap-1.5" style={{ color: '#10b981' }}>
                      <span aria-hidden>🇨🇳</span> 国内快速冰冻病理共识要点
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--fg)' }}>
                      {selectedSection._enhance_frozen_pitfall_image.cnConsensusNote}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-96">
                <p style={{ color: 'var(--fg-muted)' }}>请选择一个冰冻切片场景</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
