'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  IconHome, IconMicroscope, IconFlask, IconScale, IconZap, IconTrophy,
  IconSearch, IconMenu, IconSun, IconMoon, IconDna, IconInfo, IconHelp,
  IconGithub, IconX, IconSettings, IconBookOpen, IconSnowflake, IconScissors,
  IconClipboard, IconLayers, IconMap, IconFileText, IconBrain, IconHeart,
  IconActivity,
} from './Icon';
import { NavbarProgress } from './ProgressWidgets';
import { useUser, clearUserCache } from './useUser';
import { GUIDE_START_EVENT } from './useGuide';

const NAV_PRIMARY = [
  { href: '/', label: '首页', icon: IconHome },
  { href: '/atlas', label: '病理图谱', icon: IconMicroscope },
  { href: '/markers', label: '标记物', icon: IconFlask },
  { href: '/differentials', label: '鉴别诊断', icon: IconScale },
  { href: '/review', label: '复习', icon: IconZap },
  { href: '/progress', label: '成就', icon: IconTrophy },
];

const MENU_GROUPS = [
  {
    title: '核心学习',
    items: [
      { href: '/atlas', label: '病理图谱', desc: '按器官系统浏览疾病', icon: IconMicroscope, color: '#6366f1' },
      { href: '/markers', label: '标记物数据库', desc: '免疫组化标记物判读', icon: IconFlask, color: '#22c55e' },
      { href: '/differentials', label: '鉴别诊断', desc: '常见鉴别场景与策略', icon: IconScale, color: '#f59e0b' },
      { href: '/review', label: '复习测验', desc: '闪卡式间隔重复', icon: IconZap, color: '#ec4899' },
    ],
  },
  {
    title: '专项工具',
    items: [
      { href: '/panel-builder', label: 'IHC组合构建器', desc: '交互式免疫组化鉴别诊断', icon: IconLayers, color: '#6366f1' },
      { href: '/molecular', label: '分子病理学', desc: '驱动基因与靶向检测', icon: IconDna, color: '#8b5cf6' },
      { href: '/cyto', label: '细胞病理学', desc: '分类标准与恶性风险', icon: IconBookOpen, color: '#06b6d4' },
      { href: '/frozen', label: '冰冻切片', desc: '术中快速诊断决策', icon: IconSnowflake, color: '#3b82f6' },
      { href: '/grossing', label: '取材规范', desc: '标本处理操作规程', icon: IconScissors, color: '#14b8a6' },
      { href: '/reports', label: 'CAP报告', desc: '结构化病理报告模板', icon: IconClipboard, color: '#f97316' },
      { href: '/staging', label: '分级分期系统', desc: 'TNM/FIGO/Nottingham等评分', icon: IconActivity, color: '#eab308' },
    ],
  },
  {
    title: '教学资源',
    items: [
      { href: '/cases', label: '虚拟病例', desc: '20例交互式诊断训练', icon: IconFileText, color: '#ef4444' },
      { href: '/curriculum', label: '学习路径', desc: '按年级和专科组织', icon: IconMap, color: '#22c55e' },
      { href: '/glossary', label: '术语词汇表', desc: '300+病理学术语', icon: IconBrain, color: '#f59e0b' },
      { href: '/favorites', label: '我的收藏', desc: '收藏夹与学习笔记', icon: IconHeart, color: '#ec4899' },
    ],
  },
  {
    title: '其他',
    items: [
      { href: '/search', label: '高级搜索', icon: IconSearch, color: 'var(--fg-muted)' },
      { href: '/progress', label: '学习成就', icon: IconTrophy, color: 'var(--fg-muted)' },
      { href: '/admin', label: '内容管理', icon: IconSettings, color: 'var(--fg-muted)' },
      { href: '/about', label: '关于项目', icon: IconInfo, color: 'var(--fg-muted)' },
      { href: '/help', label: '使用帮助', icon: IconHelp, color: 'var(--fg-muted)' },
    ],
  },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const user = useUser();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    const handleClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(t) &&
        menuButtonRef.current && !menuButtonRef.current.contains(t)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [menuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery('');
    }
  };

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md" style={{ borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg flex-shrink-0" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            <IconDna size={22} />
            <span className="hidden sm:inline">PathoAtlas</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5 text-sm">
            {NAV_PRIMARY.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    color: active ? 'var(--accent)' : 'var(--fg-muted)',
                    background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
                    fontWeight: active ? 600 : 400,
                    textDecoration: 'none',
                  }}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <span data-guide="progress"><NavbarProgress /></span>

            {/* Search */}
            <button
              data-guide="search"
              onClick={() => { setSearchOpen(v => !v); setMenuOpen(false); }}
              className="theme-btn"
              title="搜索"
              aria-label="搜索"
            >
              <IconSearch size={16} />
            </button>

            {/* Theme */}
            <label htmlFor="theme-toggle" className="theme-btn" title="切换主题">
              <span className="theme-icon-sun"><IconSun size={16} /></span>
              <span className="theme-icon-moon"><IconMoon size={16} /></span>
            </label>

            {/* Menu */}
            <button
              ref={menuButtonRef}
              type="button"
              className="theme-btn"
              onClick={() => { setMenuOpen(v => !v); setSearchOpen(false); setUserMenuOpen(false); }}
              aria-label="菜单"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <IconX size={18} /> : <IconMenu size={18} />}
            </button>

            {/* User avatar */}
            {user && (
              <div data-guide="user-avatar" className="relative">
                <button
                  onClick={() => { setUserMenuOpen(v => !v); setMenuOpen(false); setSearchOpen(false); }}
                  className="w-8 h-8 rounded-full overflow-hidden border-2 transition-colors cursor-pointer flex-shrink-0"
                  style={{ borderColor: userMenuOpen ? 'var(--accent)' : 'var(--border)' }}
                  title={user.name || user.email}
                >
                  {user.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.picture} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent)', color: '#fff' }}>
                      {(user.name || user.email)[0]?.toUpperCase()}
                    </span>
                  )}
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0" style={{ zIndex: 40 }} onClick={() => setUserMenuOpen(false)} />
                    <div
                      className="absolute right-0 top-10 w-56 rounded-xl border shadow-lg p-3 space-y-2"
                      style={{ background: 'var(--card)', borderColor: 'var(--border)', zIndex: 50 }}
                    >
                      <div className="px-2 py-1">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{user.name || '用户'}</div>
                        <div className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>{user.email}</div>
                        {user.isAdmin && (
                          <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}>管理员</span>
                        )}
                      </div>
                      <div style={{ borderTop: '1px solid var(--border)' }} />
                      <button
                        onClick={async () => {
                          await fetch('/api/auth/logout', { method: 'POST' });
                          clearUserCache();
                          window.location.href = '/login';
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-colors"
                        style={{ color: 'var(--danger)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--card-hover)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <form onSubmit={handleSearch} className="py-2">
            <input
              autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="搜索疾病、标记物、鉴别诊断..."
              aria-label="搜索"
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            />
          </form>
        )}
      </div>

      {/* Mega menu */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 top-14 bg-black/40 lg:bg-black/20" style={{ zIndex: -1 }} onClick={() => setMenuOpen(false)} />
          <div
            ref={menuRef}
            role="menu"
            className="absolute left-0 right-0 top-14 shadow-2xl animate-scale-in overflow-y-auto"
            style={{
              background: 'var(--card)',
              borderBottom: '1px solid var(--border)',
              maxHeight: 'calc(100vh - 3.5rem)',
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
              {/* Mobile primary nav */}
              <div className="md:hidden mb-5">
                <div className="flex flex-wrap gap-2">
                  {NAV_PRIMARY.map(({ href, label, icon: Icon }) => {
                    const active = isActive(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        role="menuitem"
                        className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors"
                        style={{
                          color: active ? 'var(--accent)' : 'var(--fg-muted)',
                          background: active ? 'rgba(99,102,241,0.1)' : 'var(--bg-secondary)',
                          fontWeight: active ? 600 : 400,
                          textDecoration: 'none',
                        }}
                      >
                        <Icon size={16} />
                        <span>{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Menu groups */}
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
                {MENU_GROUPS.map(group => (
                  <div key={group.title}>
                    <div className="text-[11px] uppercase tracking-widest font-semibold mb-3 px-1" style={{ color: 'var(--fg-muted)' }}>
                      {group.title}
                    </div>
                    <div className="space-y-0.5">
                      {group.items.map(item => (
                        <Link
                          key={item.href + item.label}
                          href={item.href}
                          role="menuitem"
                          className="group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors"
                          style={{ textDecoration: 'none' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--card-hover)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <div className="rounded-md p-1.5 mt-0.5 flex-shrink-0" style={{ background: item.color + '15', color: item.color }}>
                            <item.icon size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{item.label}</div>
                            {'desc' in item && item.desc && (
                              <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{item.desc}</div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer links */}
              <div className="mt-5 pt-4 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--border)' }}>
                <a
                  href="https://github.com/chuckieding/pathoatlas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 transition-colors"
                  style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--fg)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)'; }}
                >
                  <IconGithub size={14} />
                  <span>GitHub</span>
                </a>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    // Navigate to homepage first, then trigger guide
                    if (window.location.pathname !== '/') {
                      window.location.href = '/?guide=1';
                    } else {
                      window.dispatchEvent(new CustomEvent(GUIDE_START_EVENT));
                    }
                  }}
                  className="flex items-center gap-1 transition-colors"
                  style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <IconHelp size={14} />
                  <span>功能引导</span>
                </button>
                <button onClick={() => setMenuOpen(false)} className="flex items-center gap-1 transition-colors" style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span>关闭菜单</span>
                  <span style={{ opacity: 0.5 }}>ESC</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
