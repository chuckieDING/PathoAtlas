'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { recordDiseaseStudy } from '@/lib/progress';
import { useProgress } from '@/components/useProgress';
import { MasteryDots } from '@/components/ProgressWidgets';
import { IconCheckCircle, IconZap } from '@/components/Icon';

interface IHCItem { marker: string; result: string; note: string }
interface DiseaseData {
  id: string; nameZh: string; nameEn: string; aliases: string[]; organ: string;
  category: string; epidemiology: string; clinicalFeatures: string; grossPathology: string;
  microscopy: string; keyFeatures: string[]; ihcProfile: IHCItem[];
  molecularFeatures: string; differentialDiagnosis: string[]; grading: string;
  staging: string; prognosis: string; treatment: string;
  images: { url: string; caption: string }[]; references: string[];
}

interface OrganData { id: string; nameZh: string; icon: string; color: string }
interface DiffDisease { id: string; nameZh: string; nameEn: string; organ: string }

type Tab = 'overview' | 'microscopy' | 'ihc' | 'molecular' | 'differential' | 'clinical';

export default function DiseasePage({ params }: { params: Promise<{ organ: string; disease: string }> }) {
  const { organ, disease: diseaseId } = use(params);
  const [d, setD] = useState<DiseaseData | null>(null);
  const [organInfo, setOrganInfo] = useState<OrganData | null>(null);
  const [diffDiseases, setDiffDiseases] = useState<DiffDisease[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [xpToast, setXpToast] = useState<number | null>(null);
  const progress = useProgress();
  const mastery = progress?.diseaseMastery[diseaseId];

  useEffect(() => {
    Promise.all([
      fetch(`/api/disease?organ=${organ}&id=${diseaseId}`).then(r => r.json()),
      fetch(`/api/organ?id=${organ}`).then(r => r.json()),
    ]).then(([diseaseData, organData]) => {
      setD(diseaseData);
      setOrganInfo(organData);
      // Load differential diseases
      if (diseaseData?.differentialDiagnosis?.length) {
        fetch(`/api/diseases-by-ids?ids=${diseaseData.differentialDiagnosis.join(',')}`)
          .then(r => r.json()).then(setDiffDiseases).catch(() => {});
      }
      setLoading(false);

      // Record study after successful load (triggers XP + streak)
      if (diseaseData) {
        const wasStudiedBefore = typeof window !== 'undefined' &&
          JSON.parse(localStorage.getItem('pathoatlas-progress') || '{}')?.diseaseMastery?.[diseaseId];
        recordDiseaseStudy(diseaseId);
        const gained = wasStudiedBefore ? 5 : 10;
        setXpToast(gained);
        setTimeout(() => setXpToast(null), 2500);
      }
    }).catch(() => setLoading(false));
  }, [organ, diseaseId]);

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-pulse" style={{ color: 'var(--fg-muted)' }}>加载中...</div></div>;
  if (!d) return <div className="text-center py-16"><div className="text-4xl mb-4">🔍</div><p style={{ color: 'var(--fg-muted)' }}>疾病未找到</p><Link href="/atlas" style={{ color: 'var(--accent)' }}>返回图谱</Link></div>;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: '概述' },
    { id: 'microscopy', label: '镜下特征' },
    { id: 'ihc', label: `免疫组化 (${d.ihcProfile.length})` },
    { id: 'molecular', label: '分子病理' },
    { id: 'differential', label: `鉴别诊断 (${d.differentialDiagnosis.length})` },
    { id: 'clinical', label: '临床' },
  ];

  const categoryBadge = { malignant: '恶性', benign: '良性', precancerous: '癌前', inflammatory: '炎症', other: '其他' }[d.category] || d.category;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6 flex-wrap" style={{ color: 'var(--fg-muted)' }}>
        <Link href="/atlas" style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}>图谱</Link>
        <span>/</span>
        <Link href={`/atlas/${organ}`} style={{ color: organInfo?.color || 'var(--fg-muted)', textDecoration: 'none' }}>
          {organInfo?.icon} {organInfo?.nameZh}
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--fg)' }}>{d.nameZh}</span>
      </div>

      {/* Title */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: organInfo?.color || 'var(--fg)' }}>{d.nameZh}</h1>
            <p style={{ color: 'var(--fg-muted)' }}>{d.nameEn}</p>
            {d.aliases.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {d.aliases.map(a => <span key={a} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}>{a}</span>)}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`badge badge-${d.category}`}>{categoryBadge}</span>
            {mastery && (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                <IconCheckCircle size={14} style={{ color: '#22c55e' }} />
                <span>掌握度</span>
                <MasteryDots level={mastery.mastery} />
                <span className="tabular-nums">学习 {mastery.studyCount} 次</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* XP Toast */}
      {xpToast !== null && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg animate-slide-in"
          style={{ background: 'var(--card)', border: '1px solid var(--accent)', color: 'var(--fg)' }}>
          <IconZap size={18} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-bold">+{xpToast} XP</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
            style={{ borderBottomColor: tab === t.id ? 'var(--accent)' : 'transparent', color: tab === t.id ? 'var(--fg)' : 'var(--fg-muted)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Key Features */}
          {d.keyFeatures.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--accent)' }}>诊断要点</h3>
              <ul className="space-y-2">
                {d.keyFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm"><span style={{ color: 'var(--accent)' }}>•</span><span style={{ color: 'var(--fg)' }}>{f}</span></li>
                ))}
              </ul>
            </div>
          )}
          <Section title="流行病学" content={d.epidemiology} />
          <Section title="临床特征" content={d.clinicalFeatures} />
          <Section title="大体观察" content={d.grossPathology} />
        </div>
      )}

      {tab === 'microscopy' && (
        <div className="space-y-6">
          <Section title="镜下特征" content={d.microscopy} />
          {d.images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {d.images.map((img, i) => (
                <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <img src={img.url} alt={img.caption} className="w-full h-48 object-cover" loading="lazy" />
                  <div className="p-3 text-xs" style={{ color: 'var(--fg-muted)', background: 'var(--card)' }}>{img.caption}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'ihc' && (
        <div>
          {d.ihcProfile.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>暂无免疫组化数据</p>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--card-hover)' }}>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--fg)' }}>标记物</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--fg)' }}>结果</th>
                    <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" style={{ color: 'var(--fg)' }}>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {d.ihcProfile.map((m, i) => {
                    const isPositive = m.result.includes('+') || m.result.includes('阳');
                    return (
                      <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                        <td className="px-4 py-3 font-mono font-semibold" style={{ color: 'var(--fg)' }}>
                          <Link href={`/markers#${m.marker.toLowerCase().replace(/[^a-z0-9]/g, '-')}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{m.marker}</Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ background: isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: isPositive ? '#22c55e' : '#ef4444' }}>
                            {m.result}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs hidden sm:table-cell" style={{ color: 'var(--fg-muted)' }}>{m.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'molecular' && (
        <div className="space-y-6">
          <Section title="分子特征" content={d.molecularFeatures} />
          {d.grading && <Section title="分级" content={d.grading} />}
          {d.staging && <Section title="分期" content={d.staging} />}
        </div>
      )}

      {tab === 'differential' && (
        <div className="space-y-4">
          {d.differentialDiagnosis.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>暂无鉴别诊断数据</p>
          ) : (
            <>
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>需要与以下疾病鉴别：</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {d.differentialDiagnosis.map(diffId => {
                  const dd = diffDiseases.find(x => x.id === diffId);
                  return (
                    <Link key={diffId} href={dd ? `/atlas/${dd.organ}/${dd.id}` : '#'}
                      className="rounded-xl p-4 transition-all hover:shadow-md"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)', textDecoration: 'none' }}>
                      <div className="font-medium text-sm" style={{ color: 'var(--fg)' }}>{dd?.nameZh || diffId}</div>
                      <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{dd?.nameEn || ''}</div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'clinical' && (
        <div className="space-y-6">
          <Section title="治疗" content={d.treatment} />
          <Section title="预后" content={d.prognosis} />
          {d.references.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--fg)' }}>参考来源</h3>
              <ul className="space-y-1">
                {d.references.map((r, i) => <li key={i} className="text-xs" style={{ color: 'var(--fg-muted)' }}>• {r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--fg)' }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)', opacity: 0.85 }}>{content}</p>
    </div>
  );
}
