import Link from 'next/link';
import { getStats } from '@/lib/data';
import { IconDna, IconMicroscope, IconFlask, IconScale, IconBookOpen } from '@/components/Icon';

export const metadata = { title: '关于 - PathoAtlas' };

export default function AboutPage() {
  const stats = getStats();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-2" style={{ color: 'var(--accent)' }}>
          <IconDna size={28} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--fg)' }}>关于 PathoAtlas</h1>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          PathoAtlas 是一个面向病理学习者的结构化知识图谱。它把器官、疾病、免疫组化标记物和鉴别诊断组织成可以相互交叉引用的节点，
          让你在一次学习中同时掌握「形态学」「分子分型」「鉴别诊断」这三条学习主线。
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: IconMicroscope, label: '器官系统', value: stats.organCount },
          { icon: IconBookOpen, label: '疾病条目', value: stats.diseaseCount },
          { icon: IconFlask, label: '免疫组化', value: stats.markerCount },
          { icon: IconScale, label: '鉴别场景', value: stats.differentialCount },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <Icon size={18} style={{ color: 'var(--accent)' }} />
            <div className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--fg)' }}>{value}</div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{label}</div>
          </div>
        ))}
      </section>

      <section className="rounded-xl p-5 space-y-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>设计原则</h2>
        <ul className="text-sm space-y-2" style={{ color: 'var(--fg-muted)' }}>
          <li>• <span style={{ color: 'var(--fg)' }}>结构化</span>：按器官 → 疾病 → 六大切片（概述/镜下/免疫组化/分子/鉴别/临床）分层。</li>
          <li>• <span style={{ color: 'var(--fg)' }}>可交叉引用</span>：每个 IHC 标记物都是可点击的节点，鉴别诊断会直接跳转到对应疾病卡片。</li>
          <li>• <span style={{ color: 'var(--fg)' }}>图文并茂</span>：镜下特征通过示意图辅助理解，而非只有大段文字。</li>
          <li>• <span style={{ color: 'var(--fg)' }}>学习反馈</span>：内置 XP、连击和掌握度系统，帮助巩固高频考点。</li>
        </ul>
      </section>

      <div className="text-center">
        <Link href="/atlas" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium"
          style={{ background: 'var(--accent)', color: 'white', textDecoration: 'none' }}>
          开始浏览图谱 →
        </Link>
      </div>
    </div>
  );
}
