'use client';

import { useEffect, useState, useMemo } from 'react';
import { IconDna, IconSearch } from '@/components/Icon';

interface Variant {
  name: string;
  nameZh: string;
  frequency: string;
  significance: string;
}

interface DetectionMethod {
  method: string;
  sensitivity: string;
  turnaround: string;
  notes: string;
}

interface CompanionDiagnostic {
  drug: string;
  indication: string;
  regulatoryStatus: string;
  line: string;
}

interface MolecularMarker {
  id: string;
  geneSymbol: string;
  nameZh: string;
  nameEn: string;
  category: string;
  description: string;
  variants: Variant[];
  associatedTumors: string[];
  detectionMethods: DetectionMethod[];
  companionDiagnostics: CompanionDiagnostic[];
  tcgaSubtypes: string[];
  clinicalSignificance: string;
  references: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
  'tyrosine-kinase': '酪氨酸激酶',
  'fusion': '基因融合',
  'point-mutation': '点突变',
  'amplification': '基因扩增',
  'splice-site': '剪接位点',
  'tumor-suppressor': '抑癌基因',
  'biomarker': '生物标志物',
  'molecular-subtype': '分子分型',
};

const CATEGORY_COLORS: Record<string, string> = {
  'tyrosine-kinase': '#3b82f6',
  'fusion': '#8b5cf6',
  'point-mutation': '#f59e0b',
  'amplification': '#ef4444',
  'splice-site': '#06b6d4',
  'tumor-suppressor': '#6b7280',
  'biomarker': '#22c55e',
  'molecular-subtype': '#ec4899',
};

export default function MolecularPage() {
  const [markers, setMarkers] = useState<MolecularMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/molecular')
      .then(r => r.json())
      .then(data => {
        const items = Array.isArray(data) ? data : [];
        setMarkers(items);
        if (items.length > 0) setSelectedId(items[0].id);
        setLoading(false);
      })
      .catch(() => {
        setMarkers([]);
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(markers.map(m => m.category));
    return Array.from(cats).sort();
  }, [markers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return markers.filter(m => {
      const matchesSearch = !q ||
        m.nameZh.toLowerCase().includes(q) ||
        m.nameEn.toLowerCase().includes(q) ||
        m.geneSymbol.toLowerCase().includes(q) ||
        m.associatedTumors.some(t => t.toLowerCase().includes(q));
      const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [markers, search, categoryFilter]);

  const selected = markers.find(m => m.id === selectedId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse" style={{ color: 'var(--fg-muted)' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <IconDna size={32} style={{ color: 'var(--accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--fg)' }}>分子病理学</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          驱动基因、生物标志物、检测方法对比、伴随诊断矩阵与 TCGA 分子分型。覆盖 {markers.length} 个分子标志物。
        </p>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }}>
              <IconSearch size={14} />
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索基因/标志物/肿瘤..."
              aria-label="搜索分子病理"
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg outline-none"
              style={{ background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)' }}
            />
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategoryFilter('all')}
              className="text-[10px] px-2 py-1 rounded-full transition-colors"
              style={{
                background: categoryFilter === 'all' ? 'var(--accent)' : 'var(--card)',
                color: categoryFilter === 'all' ? '#fff' : 'var(--fg-muted)',
                border: '1px solid var(--border)',
              }}
            >
              全部
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className="text-[10px] px-2 py-1 rounded-full transition-colors"
                style={{
                  background: categoryFilter === cat ? (CATEGORY_COLORS[cat] || 'var(--accent)') : 'var(--card)',
                  color: categoryFilter === cat ? '#fff' : 'var(--fg-muted)',
                  border: `1px solid ${categoryFilter === cat ? 'transparent' : 'var(--border)'}`,
                }}
              >
                {CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>

          {/* Marker list */}
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {filtered.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className="w-full text-left px-3 py-2.5 rounded-lg transition-colors"
                style={{
                  background: selectedId === m.id ? 'var(--card-hover)' : 'transparent',
                  border: selectedId === m.id ? '1px solid var(--accent)' : '1px solid transparent',
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold"
                    style={{ background: `${CATEGORY_COLORS[m.category] || 'var(--accent)'}20`, color: CATEGORY_COLORS[m.category] || 'var(--accent)' }}
                  >
                    {m.geneSymbol}
                  </span>
                  <span className="text-xs font-medium" style={{ color: selectedId === m.id ? 'var(--fg)' : 'var(--fg-muted)' }}>
                    {m.nameZh}
                  </span>
                </div>
                <div className="text-[10px] mt-0.5 pl-1" style={{ color: 'var(--fg-muted)', opacity: 0.7 }}>
                  {m.nameEn}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-xs" style={{ color: 'var(--fg-muted)' }}>
                无匹配结果
              </div>
            )}
          </div>
        </aside>

        {/* Detail panel */}
        <main>
          {selected ? (
            <MolecularDetail marker={selected} />
          ) : (
            <div className="rounded-xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--fg-muted)' }}>请从左侧选择一个分子标志物</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function MolecularDetail({ marker: m }: { marker: MolecularMarker }) {
  const catColor = CATEGORY_COLORS[m.category] || 'var(--accent)';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--fg)' }}>{m.nameZh}</h2>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{m.nameEn}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-mono font-bold px-3 py-1 rounded-full"
              style={{ background: `${catColor}20`, color: catColor }}
            >
              {m.geneSymbol}
            </span>
            <span
              className="text-[10px] px-2 py-1 rounded-full"
              style={{ background: `${catColor}15`, color: catColor, border: `1px solid ${catColor}30` }}
            >
              {CATEGORY_LABELS[m.category] || m.category}
            </span>
          </div>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)', opacity: 0.85 }}>
          {m.description}
        </p>
      </div>

      {/* Variants */}
      {m.variants.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--accent)' }}>变异类型</h3>
          <div className="space-y-2">
            {m.variants.map((v, i) => (
              <div key={i} className="rounded-lg p-3" style={{ background: 'var(--card-hover)' }}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-xs font-semibold font-mono" style={{ color: 'var(--fg)' }}>{v.name}</span>
                    <span className="text-xs ml-2" style={{ color: 'var(--fg-muted)' }}>{v.nameZh}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--card)', color: 'var(--fg-muted)' }}>
                    {v.frequency}
                  </span>
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'var(--fg-muted)' }}>{v.significance}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Associated tumors */}
      <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--accent)' }}>相关肿瘤</h3>
        <div className="flex flex-wrap gap-1.5">
          {m.associatedTumors.map((t, i) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--card-hover)', color: 'var(--fg)' }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Detection methods comparison table */}
      {m.detectionMethods.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="px-5 py-3" style={{ background: 'var(--card)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>检测方法对比</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--card-hover)' }}>
                <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--fg)' }}>方法</th>
                <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--fg)' }}>灵敏度</th>
                <th className="text-left px-4 py-2.5 font-semibold hidden sm:table-cell" style={{ color: 'var(--fg)' }}>周转时间</th>
                <th className="text-left px-4 py-2.5 font-semibold hidden md:table-cell" style={{ color: 'var(--fg)' }}>备注</th>
              </tr>
            </thead>
            <tbody>
              {m.detectionMethods.map((d, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--fg)' }}>{d.method}</td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--fg-muted)' }}>{d.sensitivity}</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell" style={{ color: 'var(--fg-muted)' }}>{d.turnaround}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell" style={{ color: 'var(--fg-muted)' }}>{d.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Companion diagnostics (CDx) matrix */}
      {m.companionDiagnostics.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="px-5 py-3" style={{ background: 'var(--card)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>伴随诊断 (CDx) 矩阵</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--card-hover)' }}>
                <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--fg)' }}>药物</th>
                <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--fg)' }}>适应症</th>
                <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--fg)' }}>审批</th>
                <th className="text-left px-4 py-2.5 font-semibold hidden sm:table-cell" style={{ color: 'var(--fg)' }}>治疗线</th>
              </tr>
            </thead>
            <tbody>
              {m.companionDiagnostics.map((cdx, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--fg)' }}>{cdx.drug}</td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--fg-muted)' }}>{cdx.indication}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{
                        background: cdx.regulatoryStatus.includes('FDA') && cdx.regulatoryStatus.includes('NMPA')
                          ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
                        color: cdx.regulatoryStatus.includes('FDA') && cdx.regulatoryStatus.includes('NMPA')
                          ? '#22c55e' : '#3b82f6',
                      }}
                    >
                      {cdx.regulatoryStatus}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell" style={{ color: 'var(--fg-muted)' }}>{cdx.line}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TCGA molecular subtypes */}
      {m.tcgaSubtypes.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--accent)' }}>TCGA 分子分型</h3>
          <div className="space-y-1.5">
            {m.tcgaSubtypes.map((sub, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: catColor }} />
                <span style={{ color: 'var(--fg)' }}>{sub}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical significance */}
      <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: `1px solid var(--border)` }}>
        <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--accent)' }}>临床意义</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)', opacity: 0.85 }}>
          {m.clinicalSignificance}
        </p>
      </div>

      {/* References */}
      {m.references.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--fg)' }}>参考文献</h3>
          <ul className="space-y-1">
            {m.references.map((r, i) => (
              <li key={i} className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                {i + 1}. {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
