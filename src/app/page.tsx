import Link from 'next/link';
import { getOrgans, getStats, getAllDiseases } from '@/lib/data';
import {
  IconMicroscope, IconFlask, IconScale, IconZap, IconGrid, IconActivity,
  IconBookOpen, IconDna, IconSnowflake, IconScissors, IconClipboard,
  IconArrowRight, IconSearch, IconTrophy, IconBrain, IconLayers, IconMap,
  IconFileText, IconHeart,
} from '@/components/Icon';
import { OrganIcon } from '@/components/OrganIcon';
import { HomeDashboard } from '@/components/HomeDashboard';

const CORE_MODULES = [
  {
    href: '/atlas',
    icon: IconMicroscope,
    title: '病理图谱',
    desc: '按器官系统浏览疾病，学习组织形态学特征与诊断要点',
    color: '#6366f1',
    tag: '核心',
  },
  {
    href: '/markers',
    icon: IconFlask,
    title: '标记物数据库',
    desc: '50+ 常用免疫组化标记物的判读规则、阳性/阴性谱与应用场景',
    color: '#22c55e',
    tag: '核心',
  },
  {
    href: '/differentials',
    icon: IconScale,
    title: '鉴别诊断',
    desc: '常见鉴别诊断场景与标记物组合策略，附诊断决策树',
    color: '#f59e0b',
    tag: '核心',
  },
  {
    href: '/review',
    icon: IconZap,
    title: '复习测验',
    desc: '随机抽取知识点进行闪卡式间隔重复复习，强化记忆',
    color: '#ec4899',
    tag: '核心',
  },
];

const SPECIALTY_MODULES = [
  {
    href: '/molecular',
    icon: IconDna,
    title: '分子病理学',
    desc: '驱动基因、变异类型、检测方法与伴随诊断',
    color: '#8b5cf6',
  },
  {
    href: '/cyto',
    icon: IconBookOpen,
    title: '细胞病理学',
    desc: '各器官分类标准、恶性风险分层与临床处理',
    color: '#06b6d4',
  },
  {
    href: '/frozen',
    icon: IconSnowflake,
    title: '冰冻切片',
    desc: '术中快速诊断决策树、诊断陷阱与常见错误',
    color: '#3b82f6',
  },
  {
    href: '/grossing',
    icon: IconScissors,
    title: '取材规范',
    desc: '各类标本处理操作规程与取材要点',
    color: '#14b8a6',
  },
  {
    href: '/reports',
    icon: IconClipboard,
    title: 'CAP 报告',
    desc: '结构化肿瘤病理报告模板，支持生成与导出',
    color: '#f97316',
  },
  {
    href: '/panel-builder',
    icon: IconLayers,
    title: 'IHC Panel Builder',
    desc: '交互式免疫组化鉴别诊断工具，4步推导',
    color: '#6366f1',
  },
  {
    href: '/cases',
    icon: IconFileText,
    title: '虚拟病例',
    desc: '20例跨器官系统的交互式诊断训练',
    color: '#ef4444',
  },
  {
    href: '/curriculum',
    icon: IconMap,
    title: '学习路径',
    desc: '按年级和专科组织的系统化学习课程',
    color: '#22c55e',
  },
  {
    href: '/glossary',
    icon: IconBrain,
    title: '术语词汇表',
    desc: '300+病理学专业术语中英文释义',
    color: '#f59e0b',
  },
];

export default function HomePage() {
  const organs = getOrgans();
  const stats = getStats();
  const diseases = getAllDiseases();
  const featured = diseases.filter(d => d.category === 'malignant').slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      {/* ── Hero ── */}
      <section className="pt-12 sm:pt-20 pb-10 sm:pb-14 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
          style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}>
          <IconDna size={14} />
          <span>覆盖 {stats.organCount} 大器官系统 · {stats.diseaseCount}+ 种疾病 · {stats.markerCount}+ 免疫标记物</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4" style={{ color: 'var(--fg)' }}>
          Patho<span style={{ color: 'var(--accent)' }}>Atlas</span>
        </h1>
        <p className="text-base sm:text-lg max-w-2xl mx-auto mb-8" style={{ color: 'var(--fg-muted)' }}>
          全面、结构化、可交互的病理学个人学习平台
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/atlas" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}>
            开始学习 <IconArrowRight size={16} />
          </Link>
          <Link href="/search" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg-muted)', textDecoration: 'none' }}>
            <IconSearch size={15} /> 搜索
          </Link>
        </div>
      </section>

      {/* ── Stats Row ── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-14">
        {[
          { label: '器官系统', value: stats.organCount, Icon: IconGrid, color: '#6366f1' },
          { label: '疾病病种', value: stats.diseaseCount, Icon: IconBookOpen, color: '#22c55e' },
          { label: '免疫标记物', value: stats.markerCount, Icon: IconFlask, color: '#f59e0b' },
          { label: '鉴别诊断', value: stats.differentialCount, Icon: IconScale, color: '#ec4899' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg mb-2" style={{ background: s.color + '15', color: s.color }}>
              <s.Icon size={18} />
            </div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── Progress Dashboard ── */}
      <HomeDashboard />

      {/* ── Core Learning Modules ── */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>核心学习模块</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CORE_MODULES.map(m => (
            <Link key={m.href} href={m.href}
              className="group relative rounded-2xl p-5 border transition-all hover:shadow-lg overflow-hidden"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', textDecoration: 'none' }}>
              {/* Decorative gradient corner */}
              <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.07] rounded-bl-full" style={{ background: m.color }} />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-xl p-2.5" style={{ background: m.color + '15', color: m.color }}>
                    <m.icon size={22} />
                  </div>
                  <div>
                    <div className="font-bold text-base" style={{ color: 'var(--fg)' }}>{m.title}</div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: m.color + '18', color: m.color }}>
                      {m.tag}
                    </span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{m.desc}</p>
                <div className="flex items-center gap-1 mt-3 text-xs font-medium transition-all group-hover:gap-2" style={{ color: m.color }}>
                  进入模块 <IconArrowRight size={14} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Specialty Modules ── */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>专项工具</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SPECIALTY_MODULES.map(m => (
            <Link key={m.href} href={m.href}
              className="group flex items-start gap-3.5 rounded-xl p-4 border transition-all hover:shadow-md"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', textDecoration: 'none' }}>
              <div className="rounded-lg p-2 flex-shrink-0" style={{ background: m.color + '15', color: m.color }}>
                <m.icon size={20} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm mb-0.5 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                  {m.title}
                  <IconArrowRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: m.color }} />
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Organ Systems ── */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>器官系统</h2>
          <Link href="/atlas" className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            查看全部 <IconArrowRight size={13} />
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {organs.map(organ => {
            const count = diseases.filter(d => d.organ === organ.id).length;
            return (
              <Link key={organ.id} href={`/atlas/${organ.id}`}
                className="group rounded-xl p-4 border transition-all hover:shadow-md text-center flex flex-col items-center"
                style={{ background: 'var(--card)', borderColor: 'var(--border)', textDecoration: 'none' }}>
                <OrganIcon organId={organ.id} size={28} color={organ.color} withBackground />
                <div className="font-medium text-sm mt-2.5" style={{ color: organ.color }}>{organ.nameZh}</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>{count} 种疾病</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Featured Diseases ── */}
      {featured.length > 0 && (
        <section className="mb-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <IconActivity size={20} />
              常见恶性肿瘤
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featured.map(d => {
              const organ = organs.find(o => o.id === d.organ);
              return (
                <Link key={d.id} href={`/atlas/${d.organ}/${d.id}`}
                  className="group rounded-xl p-4 border transition-all hover:shadow-md"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)', textDecoration: 'none' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <OrganIcon organId={d.organ} size={16} color={organ?.color} />
                    <span className="badge badge-malignant">恶性</span>
                    <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{organ?.nameZh}</span>
                  </div>
                  <div className="font-medium text-sm mb-0.5" style={{ color: 'var(--fg)' }}>{d.nameZh}</div>
                  <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{d.nameEn}</div>
                  {d.epidemiology && (
                    <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>{d.epidemiology}</p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Quick Access Footer ── */}
      <section className="mb-12 rounded-2xl p-6 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h3 className="font-bold text-base mb-2" style={{ color: 'var(--fg)' }}>快速入口</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--fg-muted)' }}>找到你需要的学习工具</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { href: '/atlas', label: '病理图谱', icon: IconMicroscope },
            { href: '/markers', label: '标记物', icon: IconFlask },
            { href: '/differentials', label: '鉴别诊断', icon: IconScale },
            { href: '/molecular', label: '分子病理', icon: IconDna },
            { href: '/cyto', label: '细胞病理', icon: IconBookOpen },
            { href: '/frozen', label: '冰冻切片', icon: IconSnowflake },
            { href: '/grossing', label: '取材规范', icon: IconScissors },
            { href: '/reports', label: 'CAP报告', icon: IconClipboard },
            { href: '/panel-builder', label: 'IHC Panel', icon: IconLayers },
            { href: '/cases', label: '虚拟病例', icon: IconFileText },
            { href: '/curriculum', label: '学习路径', icon: IconMap },
            { href: '/glossary', label: '术语表', icon: IconBrain },
            { href: '/review', label: '复习测验', icon: IconZap },
            { href: '/favorites', label: '我的收藏', icon: IconHeart },
            { href: '/progress', label: '学习成就', icon: IconTrophy },
            { href: '/search', label: '搜索', icon: IconSearch },
          ].map(item => (
            <Link key={item.href + item.label} href={item.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: 'var(--bg-secondary)', color: 'var(--fg-muted)', textDecoration: 'none', border: '1px solid var(--border)' }}>
              <item.icon size={13} />
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
