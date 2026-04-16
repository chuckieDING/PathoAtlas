import { getDifferentials } from '@/lib/data';
import Link from 'next/link';
import { IconScale } from '@/components/Icon';
import { DifferentialFlowcharts } from './flowcharts';

export default function DifferentialsPage() {
  const diffs = getDifferentials();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
        <IconScale size={24} style={{ color: '#f59e0b' }} />
        <span>鉴别诊断</span>
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>
        常见鉴别诊断场景与免疫组化标记物组合策略，{diffs.length} 个临床场景
      </p>

      {diffs.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--fg-muted)' }}>暂无鉴别诊断数据</div>
      ) : (
        <div className="space-y-6">
          {diffs.map(d => (
            <div key={d.id} id={d.id} className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              {/* Header */}
              <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="font-bold text-base mb-1" style={{ color: 'var(--fg)' }}>{d.titleZh}</h2>
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{d.titleEn}</p>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{d.description}</p>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Key markers */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>关键标记物</div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(d.keyMarkers)).map(m => (
                      <Link key={m} href={`/markers/${m.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                        className="text-xs px-3 py-1.5 rounded-full font-mono font-medium transition-colors"
                        style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.2)', textDecoration: 'none' }}>
                        {m}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Algorithm */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>诊断思路</div>
                  <div className="rounded-lg p-4 text-sm leading-relaxed" style={{ background: 'var(--card-hover)', color: 'var(--fg)' }}>
                    {d.algorithm.split(';').map((step, i) => (
                      <div key={i} className="mb-1 last:mb-0">
                        <span style={{ color: 'var(--accent)' }}>→</span> {step.trim()}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Flowchart */}
                <DifferentialFlowcharts differentialId={d.id} />

                {/* Related diseases */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>涉及疾病</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set(d.diseases)).map(id => (
                      <span key={id} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}>{id}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
