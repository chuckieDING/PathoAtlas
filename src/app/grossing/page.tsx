'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { IconSearch, IconScissors } from '@/components/Icon';

interface GrossingProtocol {
  id: string;
  nameZh: string;
  nameEn: string;
  indication: string;
  inkScheme: string;
  incisionDirection: string;
  samplingInterval: string;
  mandatorySites: string[];
  photoRequirements: string;
  frozenConsiderations: string;
  commonErrors: string[];
  /** Set by enhancement pipeline. Holds China-specific protocol notes
   *  + a comparison against CAP. */
  _enhance_grossing_cn_protocol?: {
    cnProtocolNotes?: string;
    differencesFromCAP?: string;
  };
}

export default function GrossingPage() {
  const [protocols, setProtocols] = useState<GrossingProtocol[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/grossing')
      .then(r => r.json())
      .then(data => {
        const items = Array.isArray(data) ? data : [];
        setProtocols(items);
        if (items.length > 0) setSelectedId(items[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const selected = protocols.find(p => p.id === selectedId);
  const filtered = useMemo(() => protocols.filter(p =>
    p.nameZh.includes(searchQuery) ||
    p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.indication.includes(searchQuery)
  ), [protocols, searchQuery]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center" style={{ color: 'var(--fg-muted)' }}>
        加载中...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <IconScissors size={32} style={{ color: '#3b82f6' }} />
          <h1 className="text-3xl font-bold">取材规范 (Grossing Protocol)</h1>
        </div>
        <p style={{ color: 'var(--fg-muted)', marginTop: '0.5rem' }}>
          病理医生必备：各类标本的取材、墨水标记、分片方案、冰冻注意事项
        </p>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: List */}
        <div className="lg:col-span-1">
          <div className="mb-4">
            <div className="relative">
              <IconSearch size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--fg-muted)'
              }} />
              <input
                type="text"
                placeholder="搜索标本..."
                aria-label="搜索取材规范"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg)'
                }}
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="w-full text-left px-4 py-3 rounded-lg transition-colors"
                style={{
                  background: selectedId === p.id ? 'rgba(99,102,241,0.15)' : 'var(--card)',
                  color: selectedId === p.id ? 'var(--fg)' : 'var(--fg-muted)',
                  border: `1px solid ${selectedId === p.id ? 'var(--accent)' : 'var(--border)'}`
                }}
              >
                <div className="font-semibold text-sm">{p.nameZh}</div>
                <div className="text-xs" style={{ opacity: 0.7 }}>{p.nameEn}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-6">
              {/* Title */}
              <div>
                <h2 className="text-2xl font-bold mb-1">{selected.nameZh}</h2>
                <p style={{ color: 'var(--fg-muted)' }}>{selected.nameEn}</p>
              </div>

              {/* Indication */}
              <Section
                title="适应症"
                content={selected.indication}
              />

              {/* Ink Scheme */}
              <Section
                title="墨水标记方案"
                content={selected.inkScheme}
              />

              {/* Incision */}
              <Section
                title="切开方向"
                content={selected.incisionDirection}
              />

              {/* Sampling Interval */}
              <Section
                title="分片间隔"
                content={selected.samplingInterval}
              />

              {/* Mandatory Sites */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">必取部位清单</h3>
                <ul className="space-y-2">
                  {selected.mandatorySites.map((site, i) => (
                    <li key={i} className="flex gap-3">
                      <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>•</span>
                      <span>{site}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Photos */}
              <Section
                title="拍照要求"
                content={selected.photoRequirements}
              />

              {/* Frozen */}
              <Section
                title="冰冻注意事项"
                content={selected.frozenConsiderations}
              />

              {/* Common Errors */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">常见错误 ⚠️</h3>
                <ul className="space-y-2">
                  {selected.commonErrors.map((error, i) => (
                    <li
                      key={i}
                      className="px-4 py-2 rounded-lg"
                      style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid #ef4444' }}
                    >
                      <span style={{ color: 'var(--fg)' }}>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* China-specific protocol (from enhancement pipeline) */}
              {selected._enhance_grossing_cn_protocol && (
                <div className="rounded-lg p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <h3 className="font-semibold mb-3 text-lg flex items-center gap-2" style={{ color: '#10b981' }}>
                    <span aria-hidden>🇨🇳</span> 国内取材规范要点
                  </h3>
                  {selected._enhance_grossing_cn_protocol.cnProtocolNotes && (
                    <div className="mb-3">
                      <h4 className="font-medium text-sm mb-1.5" style={{ color: 'var(--fg)' }}>国内规范说明</h4>
                      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--fg)', opacity: 0.85 }}>
                        {selected._enhance_grossing_cn_protocol.cnProtocolNotes}
                      </p>
                    </div>
                  )}
                  {selected._enhance_grossing_cn_protocol.differencesFromCAP && (
                    <div>
                      <h4 className="font-medium text-sm mb-1.5" style={{ color: 'var(--fg)' }}>与 CAP 协议的差异</h4>
                      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--fg)', opacity: 0.85 }}>
                        {selected._enhance_grossing_cn_protocol.differencesFromCAP}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12" style={{ color: 'var(--fg-muted)' }}>
              无结果
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
          💡 提示：这些取材规范基于CAP和WHO指南。具体操作还需结合本机构的标准操作流程(SOP)。
          遇有特殊情况（如多原发、转移瘤等），请与病理医生沟通后再决定取材方案。
        </p>
      </div>
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h3 className="font-semibold mb-2 text-lg">{title}</h3>
      <p style={{ color: 'var(--fg-muted)', lineHeight: 1.6 }}>
        {content}
      </p>
    </div>
  );
}