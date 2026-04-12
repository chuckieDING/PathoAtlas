import Link from 'next/link';
import { getOrgans, getStats, getAllDiseases } from '@/lib/data';
import { IconMicroscope, IconFlask, IconScale, IconBrain, IconGrid, IconActivity, IconBookOpen } from '@/components/Icon';
import { HomeDashboard } from '@/components/HomeDashboard';

export default function HomePage() {
  const organs = getOrgans();
  const stats = getStats();
  const diseases = getAllDiseases();
  const featured = diseases.filter(d => d.category === 'malignant').slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero */}
      <div className="text-center py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'var(--fg)' }}>PathoAtlas</h1>
        <p className="text-lg mb-2" style={{ color: 'var(--fg-muted)' }}>病理知识图谱</p>
        <p className="text-sm max-w-xl mx-auto" style={{ color: 'var(--fg-muted)' }}>
          全面覆盖{stats.organCount}大器官系统、{stats.diseaseCount}+种疾病、{stats.markerCount}+个免疫组化标记物的结构化病理学学习平台
        </p>
      </div>

      {/* User Progress Dashboard */}
      <HomeDashboard />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
        {[
          { label: '器官系统', value: stats.organCount, Icon: IconGrid, color: '#6366f1' },
          { label: '疾病病种', value: stats.diseaseCount, Icon: IconBookOpen, color: '#22c55e' },
          { label: '免疫标记物', value: stats.markerCount, Icon: IconFlask, color: '#f59e0b' },
          { label: '鉴别诊断', value: stats.differentialCount, Icon: IconScale, color: '#ec4899' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <s.Icon size={22} style={{ color: s.color }} />
            <div className="text-2xl font-bold mt-2" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Modules */}
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--fg)' }}>学习模块</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {[
          { href: '/atlas', Icon: IconMicroscope, title: '病理图谱', desc: '按器官系统浏览疾病，学习形态学特征', color: '#6366f1' },
          { href: '/markers', Icon: IconFlask, title: '标记物数据库', desc: '50+常用免疫组化标记物的判读与应用', color: '#22c55e' },
          { href: '/differentials', Icon: IconScale, title: '鉴别诊断', desc: '常见鉴别诊断场景与标记物组合策略', color: '#f59e0b' },
          { href: '/review', Icon: IconBrain, title: '复习测验', desc: '随机抽取知识点进行闪卡式复习', color: '#ec4899' },
        ].map(m => (
          <Link key={m.href} href={m.href} className="rounded-xl p-5 border transition-all hover:shadow-lg"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', textDecoration: 'none' }}>
            <div className="rounded-lg p-2.5 w-fit mb-3" style={{ background: m.color + '18', color: m.color }}>
              <m.Icon size={22} />
            </div>
            <div className="font-semibold text-sm mb-1" style={{ color: m.color }}>{m.title}</div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{m.desc}</p>
          </Link>
        ))}
      </div>

      {/* Organ Systems Grid */}
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--fg)' }}>器官系统</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-12">
        {organs.map(organ => {
          const count = diseases.filter(d => d.organ === organ.id).length;
          return (
            <Link key={organ.id} href={`/atlas/${organ.id}`}
              className="rounded-xl p-4 border transition-all hover:shadow-md text-center"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', textDecoration: 'none' }}>
              <div className="text-3xl mb-2">{organ.icon}</div>
              <div className="font-medium text-sm" style={{ color: organ.color }}>{organ.nameZh}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{count} 种疾病</div>
            </Link>
          );
        })}
      </div>

      {/* Featured Diseases */}
      {featured.length > 0 && (
        <>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <IconActivity size={18} />
            <span>常见恶性肿瘤</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featured.map(d => {
              const organ = organs.find(o => o.id === d.organ);
              return (
                <Link key={d.id} href={`/atlas/${d.organ}/${d.id}`}
                  className="rounded-xl p-4 border transition-all hover:shadow-md"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)', textDecoration: 'none' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span>{organ?.icon}</span>
                    <span className="badge badge-malignant">恶性</span>
                  </div>
                  <div className="font-medium text-sm mb-1" style={{ color: 'var(--fg)' }}>{d.nameZh}</div>
                  <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{d.nameEn}</div>
                  <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>{d.epidemiology}</p>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
