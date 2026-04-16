'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { IconFlask, IconBookOpen, IconSearch } from '@/components/Icon';
import { OrganIcon } from '@/components/OrganIcon';
import { ImageLightbox } from '@/components/ImageLightbox';
import { getMarkerDiagram, type MarkerDiagram } from '@/lib/markerDiagrams';

// ── Types ──────────────────────────────────────────────────────────

interface StainingImage { url: string; fullUrl?: string; caption: string; source?: string }
interface StainingGroup { id: string; label: string; description?: string; images: StainingImage[] }

interface ConsensusItem {
  id: string; title: string; summary: string;
  organization?: string; year?: number; sourceUrl?: string; viewUrl?: string;
}
interface LiteratureItem {
  id: string; title: string; summary: string;
  authors?: string; journal?: string; year?: number; sourceUrl?: string; viewUrl?: string;
}

interface CloneVariant { clone: string; source: string; notes: string }
interface ControlTissue { positive: string; negative: string }
interface CloneComparison {
  id: string; titleZh: string;
  clone1: { name: string; vendor: string; pattern: string; interpretation: string };
  clone2: { name: string; vendor: string; pattern: string; interpretation: string };
  clinicalImplication: string; context: string;
}

interface Marker {
  id: string; nameZh: string; nameEn: string; abbreviation: string; category: string;
  cloneInfo: string; targetProtein: string; cellularLocalization: string;
  normalExpression: string; function: string; interpretation: string;
  clinicalSignificance: string; positiveIn: string[]; negativeIn: string[];
  relatedDrugs: string[]; pitfalls: string; references?: string[];
  expertConsensus?: ConsensusItem[];
  literature?: LiteratureItem[];
  stainingImages?: StainingGroup[];
  organs?: string[];
  cloneVariants?: CloneVariant[];
  controlTissue?: ControlTissue;
  artifacts?: string[];
  cloneComparisons?: CloneComparison[];
}

interface Organ { id: string; nameZh: string; nameEn: string; color: string }

type Tab = 'overview' | 'interpretation' | 'staining' | 'consensus' | 'literature';

// ── Page ───────────────────────────────────────────────────────────

export default function MarkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [m, setM] = useState<Marker | null>(null);
  const [organs, setOrgans] = useState<Organ[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  // Lightbox + per-image "full image loaded" state, keyed by thumbnail URL
  // so the choice survives tab switches within the detail page.
  const [lightbox, setLightbox] = useState<{ url: string; caption: string } | null>(null);
  const [fullLoaded, setFullLoaded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      fetch(`/api/marker?id=${encodeURIComponent(id)}`).then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      }),
      fetch('/api/organs').then(r => r.json()),
    ]).then(([marker, orgs]) => {
      setM(marker);
      setOrgans(Array.isArray(orgs) ? orgs : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse" style={{ color: 'var(--fg-muted)' }}>加载中...</div>
      </div>
    );
  }

  if (notFound || !m) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="flex justify-center mb-4" style={{ color: 'var(--fg-muted)' }}>
          <IconSearch size={36} />
        </div>
        <p className="mb-3" style={{ color: 'var(--fg-muted)' }}>未找到 id 为 <code>{id}</code> 的标记物</p>
        <Link href="/markers" style={{ color: 'var(--accent)' }}>← 返回标记物目录</Link>
      </div>
    );
  }

  const diagram = getMarkerDiagram(m.id);
  const markerOrgans = (m.organs || [])
    .map(oid => organs.find(o => o.id === oid))
    .filter((o): o is Organ => !!o);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6 flex-wrap" style={{ color: 'var(--fg-muted)' }}>
        <Link href="/markers" style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}>
          <span className="inline-flex items-center gap-1.5">
            <IconFlask size={14} />
            标记物目录
          </span>
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--fg)' }}>{m.abbreviation || m.nameEn}</span>
      </div>

      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-wrap items-start gap-3 mb-2">
          <h1 className="font-mono text-3xl font-bold" style={{ color: 'var(--accent)' }}>
            {m.abbreviation || m.nameEn}
          </h1>
          <div className="flex flex-col">
            <span className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>{m.nameZh}</span>
            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{m.nameEn}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}>
            {m.category}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}>
            {m.cellularLocalization}
          </span>
          {diagram && (
            <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
              <IconBookOpen size={11} />
              机制图
            </span>
          )}
          {markerOrgans.map(o => (
            <span
              key={o.id}
              className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}
            >
              <OrganIcon organId={o.id} size={11} color={o.color} />
              {o.nameZh}
            </span>
          ))}
        </div>
      </header>

      {/* Tabs */}
      {(() => {
        const stainingCount = m.stainingImages?.length || 0;
        const consensusCount = m.expertConsensus?.length || 0;
        const literatureCount = m.literature?.length || 0;
        const tabs: { id: Tab; label: string }[] = [
          { id: 'overview', label: '概述' },
          { id: 'interpretation', label: '判读' },
          { id: 'staining', label: `染色形态${stainingCount ? ` (${stainingCount})` : ''}` },
          { id: 'consensus', label: `专家共识${consensusCount ? ` (${consensusCount})` : ''}` },
          { id: 'literature', label: `文献参考${literatureCount ? ` (${literatureCount})` : ''}` },
        ];
        return (
          <div className="flex gap-1 overflow-x-auto mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
                style={{
                  borderBottomColor: tab === t.id ? 'var(--accent)' : 'transparent',
                  color: tab === t.id ? 'var(--fg)' : 'var(--fg-muted)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {diagram && <MechanismFigure diagram={diagram} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoBox label="靶蛋白" value={m.targetProtein} />
            <InfoBox label="亚细胞定位" value={m.cellularLocalization} />
            <InfoBox label="克隆号" value={m.cloneInfo} mono />
            <InfoBox label="正常表达" value={m.normalExpression} />
          </div>
          <InfoBox label="功能" value={m.function} />

          {/* Clone Variants */}
          {m.cloneVariants && m.cloneVariants.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--fg-muted)' }}>克隆号变体</div>
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--card-hover)' }}>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--fg-muted)' }}>克隆号</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--fg-muted)' }}>来源/厂商</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--fg-muted)' }}>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.cloneVariants.map((cv, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                        <td className="px-3 py-2 font-mono font-medium" style={{ color: 'var(--accent)' }}>{cv.clone}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--fg)' }}>{cv.source}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--fg-muted)' }}>{cv.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Control Tissue */}
          {m.controlTissue && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg p-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div className="text-xs font-semibold mb-1" style={{ color: '#22c55e' }}>阳性对照组织</div>
                <div className="text-sm" style={{ color: 'var(--fg)' }}>{m.controlTissue.positive}</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="text-xs font-semibold mb-1" style={{ color: '#ef4444' }}>阴性对照组织</div>
                <div className="text-sm" style={{ color: 'var(--fg)' }}>{m.controlTissue.negative}</div>
              </div>
            </div>
          )}

          {/* Artifacts */}
          {m.artifacts && m.artifacts.length > 0 && (
            <div className="rounded-lg p-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div className="text-xs font-semibold mb-2" style={{ color: '#f59e0b' }}>常见染色陷阱</div>
              <ul className="space-y-1">
                {m.artifacts.map((a, i) => (
                  <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--fg)' }}>
                    <span style={{ color: '#f59e0b' }}>•</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Clone Comparisons */}
          {m.cloneComparisons && m.cloneComparisons.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--fg-muted)' }}>克隆号对比</div>
              <div className="space-y-3">
                {m.cloneComparisons.map(cc => (
                  <div key={cc.id} className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <div className="font-semibold text-sm mb-2" style={{ color: 'var(--fg)' }}>{cc.titleZh}</div>
                    <div className="text-xs mb-2 px-2 py-1 rounded-md inline-block" style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}>
                      场景：{cc.context}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <div className="rounded-lg p-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <div className="font-mono font-bold text-sm mb-1" style={{ color: 'var(--accent)' }}>{cc.clone1.name}</div>
                        <div className="text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>{cc.clone1.vendor}</div>
                        <div className="text-xs" style={{ color: 'var(--fg)' }}>{cc.clone1.pattern}</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{cc.clone1.interpretation}</div>
                      </div>
                      <div className="rounded-lg p-3" style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)' }}>
                        <div className="font-mono font-bold text-sm mb-1" style={{ color: '#ec4899' }}>{cc.clone2.name}</div>
                        <div className="text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>{cc.clone2.vendor}</div>
                        <div className="text-xs" style={{ color: 'var(--fg)' }}>{cc.clone2.pattern}</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{cc.clone2.interpretation}</div>
                      </div>
                    </div>
                    <div className="text-xs mt-3 p-2 rounded-md" style={{ background: 'rgba(245,158,11,0.08)', color: 'var(--fg)' }}>
                      <span className="font-semibold" style={{ color: '#f59e0b' }}>临床意义：</span>{cc.clinicalImplication}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'interpretation' && (
        <div className="space-y-4">
          <InfoBox label="判读标准" value={m.interpretation} />
          <InfoBox label="临床意义" value={m.clinicalSignificance} />
          {m.positiveIn.length > 0 && (
            <TagRow label="阳性表达（常见肿瘤）" items={m.positiveIn} bg="rgba(34,197,94,0.1)" color="#22c55e" />
          )}
          {m.negativeIn.length > 0 && (
            <TagRow label="阴性表达（常见肿瘤）" items={m.negativeIn} bg="rgba(239,68,68,0.1)" color="#ef4444" />
          )}
          {m.relatedDrugs.length > 0 && (
            <TagRow label="相关靶向药" items={m.relatedDrugs} bg="rgba(99,102,241,0.12)" color="#818cf8" />
          )}
          {m.pitfalls && <InfoBox label="诊断陷阱" value={m.pitfalls} accent />}
        </div>
      )}

      {tab === 'staining' && (
        <div>
          {m.stainingImages && m.stainingImages.length > 0 ? (
            <StainingGallery
              groups={m.stainingImages}
              fullLoaded={fullLoaded}
              onLoadFull={(url) => setFullLoaded((s) => ({ ...s, [url]: true }))}
              onOpen={setLightbox}
            />
          ) : (
            <div className="rounded-xl p-8 text-center" style={{ background: 'var(--card)', border: '1px dashed var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>该标记物尚未配置染色形态分组</p>
              <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)', opacity: 0.7 }}>
                可在管理后台 <Link href="/admin" style={{ color: 'var(--accent)' }}>/admin</Link> 添加阴/阳性、1+/2+/3+ 等分组并上传图片
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'consensus' && (
        <div>
          {m.expertConsensus && m.expertConsensus.length > 0 ? (
            <div className="space-y-3">
              {m.expertConsensus.map(c => (
                <article key={c.id} className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>{c.title}</h3>
                    <div className="flex items-center gap-2">
                      {c.organization && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--card-hover)', color: 'var(--accent)' }}>{c.organization}</span>
                      )}
                      {c.year && <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>{c.year}</span>}
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{c.summary}</p>
                  <ResourceLinks sourceUrl={c.sourceUrl} viewUrl={c.viewUrl} />
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl p-8 text-center" style={{ background: 'var(--card)', border: '1px dashed var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>暂无专家共识条目</p>
            </div>
          )}
        </div>
      )}

      {tab === 'literature' && (
        <div>
          {m.literature && m.literature.length > 0 ? (
            <div className="space-y-3">
              {m.literature.map(lit => (
                <article key={lit.id} className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--fg)' }}>{lit.title}</h3>
                  <div className="flex items-center gap-2 text-[11px] mb-2 flex-wrap" style={{ color: 'var(--fg-muted)' }}>
                    {lit.authors && <span>{lit.authors}</span>}
                    {lit.journal && <span>· {lit.journal}</span>}
                    {lit.year && <span className="tabular-nums">· {lit.year}</span>}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{lit.summary}</p>
                  <ResourceLinks sourceUrl={lit.sourceUrl} viewUrl={lit.viewUrl} />
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl p-8 text-center" style={{ background: 'var(--card)', border: '1px dashed var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>暂无文献条目</p>
            </div>
          )}
        </div>
      )}

      {lightbox && <ImageLightbox image={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function SectionHeading({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
      {icon}
      {children}
    </h2>
  );
}

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
      <img src={diagram.url} alt={diagram.title} className="w-full block"
        style={{ maxHeight: '340px', objectFit: 'contain' }} loading="lazy" />
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
      <div className={`text-sm ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--fg)' }}>{value}</div>
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

// Result-group color palette: 阴性 red, 1+ amber, 2+ blue, 3+ strong green,
// 阳性 mild green, default neutral. Keeps the gallery scannable.
function groupTone(label: string): { bg: string; color: string; border: string } {
  const l = label.trim().toLowerCase();
  if (l.includes('阴') || l === 'negative' || l === '-' || l === '0') {
    return { bg: 'rgba(239,68,68,0.10)', color: '#ef4444', border: 'rgba(239,68,68,0.35)' };
  }
  if (l === '1+' || l.includes('弱') || l === 'weak') {
    return { bg: 'rgba(251,191,36,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.4)' };
  }
  if (l === '2+' || l.includes('中') || l === 'moderate' || l.includes('equivocal') || l.includes('不确定')) {
    return { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.4)' };
  }
  if (l === '3+' || l.includes('强') || l === 'strong') {
    return { bg: 'rgba(34,197,94,0.14)', color: '#16a34a', border: 'rgba(22,163,74,0.5)' };
  }
  if (l.includes('阳') || l === 'positive' || l === '+') {
    return { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', border: 'rgba(34,197,94,0.4)' };
  }
  return { bg: 'var(--card-hover)', color: 'var(--fg)', border: 'var(--border)' };
}

function StainingGallery({
  groups,
  fullLoaded,
  onLoadFull,
  onOpen,
}: {
  groups: StainingGroup[];
  fullLoaded: Record<string, boolean>;
  onLoadFull: (url: string) => void;
  onOpen: (img: { url: string; caption: string }) => void;
}) {
  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const tone = groupTone(g.label);
        const count = g.images?.length || 0;
        return (
          <div
            key={g.id}
            className="rounded-xl p-4"
            style={{ background: 'var(--card)', border: `1px solid ${tone.border}` }}
          >
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: tone.bg, color: tone.color, border: `1px solid ${tone.border}` }}
                >
                  {g.label}
                </span>
                {g.description && (
                  <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{g.description}</span>
                )}
              </div>
              <span className="text-[11px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                {count} 张
              </span>
            </div>
            {count === 0 ? (
              <div
                className="text-xs text-center py-6 rounded"
                style={{ color: 'var(--fg-muted)', border: '1px dashed var(--border)', background: 'var(--bg-secondary)' }}
              >
                暂无 {g.label} 结果的染色图 · 管理后台可上传
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {g.images.map((img, i) => {
                  const hasFull = !!img.fullUrl;
                  const isFull = hasFull && !!fullLoaded[img.url];
                  // Thumbnail is `url` by default; once the user clicks
                  // "加载原图", swap in `fullUrl` for the in-page <img>.
                  // The lightbox always uses the highest-res variant.
                  const displaySrc = isFull && img.fullUrl ? img.fullUrl : img.url;
                  const lightboxImg = {
                    url: img.fullUrl || img.url,
                    caption: img.caption || g.label,
                  };
                  return (
                    <figure
                      key={i}
                      className="rounded-lg overflow-hidden group flex flex-col"
                      style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
                    >
                      <div
                        className="relative cursor-zoom-in"
                        onClick={() => onOpen(lightboxImg)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={displaySrc}
                          alt={img.caption || g.label}
                          className="w-full aspect-square object-cover transition-transform group-hover:scale-[1.03]"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.25'; }}
                        />
                        {hasFull && (
                          <span
                            className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              background: isFull ? 'rgba(34,197,94,0.9)' : 'rgba(0,0,0,0.55)',
                              color: '#fff',
                            }}
                          >
                            {isFull ? '原图' : '压缩图'}
                          </span>
                        )}
                      </div>
                      <figcaption className="p-2 text-[11px] leading-snug flex-1" style={{ color: 'var(--fg-muted)', background: 'var(--card)' }}>
                        {img.caption && <div>{img.caption}</div>}
                        {(img.source || (hasFull && !isFull)) && (
                          <div className="mt-1.5 flex items-center justify-between gap-1 flex-wrap">
                            {img.source && (
                              <span className="text-[9px] opacity-70">来源：{img.source}</span>
                            )}
                            {hasFull && !isFull && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onLoadFull(img.url); }}
                                className="text-[10px] px-1.5 py-0.5 rounded ml-auto"
                                style={{
                                  background: 'var(--card-hover)',
                                  color: 'var(--accent)',
                                  border: '1px solid var(--border)',
                                }}
                              >
                                加载原图
                              </button>
                            )}
                          </div>
                        )}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResourceLinks({ sourceUrl, viewUrl }: { sourceUrl?: string; viewUrl?: string }) {
  if (!sourceUrl && !viewUrl) return null;
  // Detect whether the "view" link is a PDF — either by extension or by
  // being an admin-uploaded file under /uploads/. Browsers natively render
  // PDFs in a new tab, so a plain <a target="_blank"> is enough; we just
  // badge the button so users know what to expect.
  const isPdf = !!viewUrl && /\.pdf(\?|$)/i.test(viewUrl);
  return (
    <div className="flex items-center gap-2 mt-3">
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noreferrer"
          className="text-[11px] px-2.5 py-1 rounded-md"
          style={{ background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border)', textDecoration: 'none' }}>
          源地址 ↗
        </a>
      )}
      {viewUrl && (
        <a href={viewUrl} target="_blank" rel="noreferrer"
          className="text-[11px] px-2.5 py-1 rounded-md inline-flex items-center gap-1"
          style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}>
          {isPdf && <span className="text-[9px] font-bold px-1 rounded" style={{ background: 'rgba(255,255,255,0.25)' }}>PDF</span>}
          在线阅览
        </a>
      )}
    </div>
  );
}
