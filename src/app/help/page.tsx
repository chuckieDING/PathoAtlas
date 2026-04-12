import Link from 'next/link';
import { IconHelp, IconSearch, IconMicroscope, IconFlask, IconBrain, IconTrophy } from '@/components/Icon';

export const metadata = { title: '使用帮助 - PathoAtlas' };

const TIPS: { icon: typeof IconHelp; title: string; body: string }[] = [
  {
    icon: IconMicroscope,
    title: '浏览图谱',
    body: '从首页进入「图谱」，按器官系统选择感兴趣的模块。每个模块下的疾病会按恶性 / 良性 / 癌前 / 炎症等分类组织，便于对比学习。',
  },
  {
    icon: IconFlask,
    title: '标记物交叉引用',
    body: '免疫组化表格中的每一行都是可点击的链接，会跳到标记物数据库中该抗体的详细条目，包括克隆、定位、相关药物和常见陷阱。',
  },
  {
    icon: IconSearch,
    title: '全局搜索',
    body: '点击顶栏的放大镜或使用菜单中的「高级搜索」，可以跨疾病、标记物、鉴别场景进行全文检索，支持中英文关键词。',
  },
  {
    icon: IconBrain,
    title: '复习模式',
    body: '「复习」会基于你的学习记录生成一组抽认卡，用于快速测试关键鉴别点和 IHC 表达模式。',
  },
  {
    icon: IconTrophy,
    title: '学习成就与连击',
    body: '每次打开一个新疾病会获得 XP，同一天多次打开会获得少量加成。连续多日学习会解锁连击徽章，帮助保持学习节奏。',
  },
];

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <IconHelp size={24} style={{ color: 'var(--accent)' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>使用帮助</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>几分钟了解 PathoAtlas 的主要功能。</p>
      </header>

      <div className="space-y-3">
        {TIPS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-start gap-3">
              <div className="rounded-lg p-2" style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent)' }}>
                <Icon size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--fg)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-4">
        <Link href="/atlas" className="text-sm" style={{ color: 'var(--accent)' }}>开始学习 →</Link>
      </div>
    </div>
  );
}
