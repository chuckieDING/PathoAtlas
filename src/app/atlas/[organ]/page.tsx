import Link from 'next/link';
import { getOrgan, getDiseasesByOrgan, getOrgans } from '@/lib/data';
import { notFound } from 'next/navigation';
import { OrganIcon } from '@/components/OrganIcon';

export function generateStaticParams() {
  return getOrgans().map(o => ({ organ: o.id }));
}

export default async function OrganPage({ params }: { params: Promise<{ organ: string }> }) {
  const { organ: organId } = await params;
  const organ = getOrgan(organId);
  if (!organ) notFound();

  const diseases = getDiseasesByOrgan(organId);
  const categories = ['malignant', 'benign', 'precancerous', 'inflammatory', 'other'] as const;
  const categoryLabels: Record<string, string> = {
    malignant: '恶性肿瘤', benign: '良性病变', precancerous: '癌前病变', inflammatory: '炎症性疾病', other: '其他',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
        <Link href="/atlas" style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}>图谱</Link>
        <span>/</span>
        <span className="flex items-center gap-1.5" style={{ color: 'var(--fg)' }}>
          <OrganIcon organId={organ.id} size={16} color={organ.color} />
          {organ.nameZh}
        </span>
      </div>

      {/* Header */}
      <div className="rounded-2xl p-6 mb-8" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-4 mb-3">
          <OrganIcon organId={organ.id} size={40} color={organ.color} withBackground />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: organ.color }}>{organ.nameZh}</h1>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{organ.nameEn}</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{organ.description}</p>

        {/* China-specific epidemiology (NCCR data, populated by enhancement pipeline) */}
        {(() => {
          const cn = (organ as { _enhance_organ_epidemiology_cn?: {
            cnEpidemiology?: {
              incidencePer100k?: number;
              mortalityPer100k?: number;
              year?: number;
              maleFemaleRatio?: string;
              hotspotRegions?: string[];
            };
          } })._enhance_organ_epidemiology_cn?.cnEpidemiology;
          if (!cn) return null;
          const stats = [
            { label: '发病率', value: cn.incidencePer100k != null ? `${cn.incidencePer100k}` : null, unit: '/10万' },
            { label: '死亡率', value: cn.mortalityPer100k != null ? `${cn.mortalityPer100k}` : null, unit: '/10万' },
            { label: '男:女', value: cn.maleFemaleRatio || null, unit: '' },
          ].filter(s => s.value != null);
          if (stats.length === 0 && !cn.hotspotRegions?.length) return null;
          return (
            <div className="mt-4 rounded-lg p-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span aria-hidden>🇨🇳</span>
                <h3 className="text-xs font-semibold" style={{ color: '#10b981' }}>中国流行病学（NCCR{cn.year ? ` ${cn.year}` : ''}）</h3>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
                {stats.map(s => (
                  <div key={s.label}>
                    <span style={{ color: 'var(--fg-muted)' }}>{s.label}：</span>
                    <span className="font-medium tabular-nums" style={{ color: 'var(--fg)' }}>{s.value}</span>
                    {s.unit && <span className="ml-0.5" style={{ color: 'var(--fg-muted)' }}>{s.unit}</span>}
                  </div>
                ))}
                {cn.hotspotRegions && cn.hotspotRegions.length > 0 && (
                  <div>
                    <span style={{ color: 'var(--fg-muted)' }}>高发地区：</span>
                    <span style={{ color: 'var(--fg)' }}>{cn.hotspotRegions.join('、')}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {organ.keyPatterns.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {organ.keyPatterns.map(p => (
              <span key={p} className="text-xs px-2.5 py-1 rounded-full" style={{ background: organ.color + '18', color: organ.color }}>{p}</span>
            ))}
          </div>
        )}
      </div>

      {/* Diseases grouped by category */}
      {categories.map(cat => {
        const group = diseases.filter(d => d.category === cat);
        if (group.length === 0) return null;
        return (
          <div key={cat} className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
              <span className={`badge badge-${cat}`}>{categoryLabels[cat]}</span>
              <span className="text-xs">{group.length} 种</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.map(d => (
                <Link key={d.id} href={`/atlas/${organId}/${d.id}`}
                  className="rounded-xl p-4 border transition-all hover:shadow-md"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)', textDecoration: 'none' }}>
                  <div className="font-medium text-sm mb-1" style={{ color: 'var(--fg)' }}>{d.nameZh}</div>
                  <div className="text-xs mb-2" style={{ color: 'var(--fg-muted)' }}>{d.nameEn}</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {d.aliases.slice(0, 2).map(a => (
                      <span key={a} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}>{a}</span>
                    ))}
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: 'var(--fg-muted)' }}>{d.epidemiology}</p>
                  {d.ihcProfile.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                      {d.ihcProfile.slice(0, 4).map(m => (
                        <span key={m.marker} className="text-xs px-1.5 py-0.5 rounded font-mono"
                          style={{ background: m.result.includes('+') || m.result.includes('阳') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            color: m.result.includes('+') || m.result.includes('阳') ? '#22c55e' : '#ef4444' }}>
                          {m.marker}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
