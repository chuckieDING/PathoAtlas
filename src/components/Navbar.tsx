'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  IconHome, IconMicroscope, IconFlask, IconScale, IconBrain, IconTrophy,
  IconSearch, IconMenu, IconSun, IconMoon, IconDna, IconInfo, IconHelp,
  IconGithub, IconX, IconSettings, IconBookOpen,
} from './Icon';
import { NavbarProgress } from './ProgressWidgets';

const NAV = [
  { href: '/', label: '首页', icon: IconHome },
  { href: '/atlas', label: '图谱', icon: IconMicroscope },
  { href: '/markers', label: '标记物', icon: IconFlask },
  { href: '/differentials', label: '鉴别', icon: IconScale },
  { href: '/review', label: '复习', icon: IconBrain },
  { href: '/progress', label: '成就', icon: IconTrophy },
];

const MENU_EXTRAS = [
  { href: '/search', label: '高级搜索', icon: IconSearch },
  { href: '/molecular', label: '分子病理学', icon: IconDna },
  { href: '/reports', label: 'CAP报告', icon: IconBookOpen },
  { href: '/cyto', label: '细胞病理学', icon: IconFlask },
  { href: '/frozen', label: '冰冻切片', icon: IconBrain },
  { href: '/grossing', label: '取材规范', icon: IconMicroscope },
  { href: '/progress', label: '学习成就', icon: IconTrophy },
  { href: '/admin', label: '内容管理', icon: IconSettings },
  { href: '/about', label: '关于项目', icon: IconInfo },
  { href: '/help', label: '使用帮助', icon: IconHelp },
  { href: 'https://github.com/chuckieding/pathoatlas', label: 'GitHub 仓库', icon: IconGithub, external: true },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close menu on route change — browser back/forward buttons don't fire our
  // onClick handlers, so we need to sync menu visibility with the pathname.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Close menu on Escape + click-outside (keeps the button responsive on all screens)
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

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md" style={{ borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg flex-shrink-0" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            <IconDna size={22} />
            <span>PathoAtlas</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 text-sm">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    color: active ? 'var(--fg)' : 'var(--fg-muted)',
                    background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                    textDecoration: 'none',
                  }}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <NavbarProgress />
            <button
              onClick={() => setSearchOpen(v => !v)}
              className="theme-btn"
              title="搜索"
              aria-label="搜索"
              aria-expanded={searchOpen}
            >
              <IconSearch size={16} />
            </button>

            <label htmlFor="theme-toggle" className="theme-btn" title="切换主题">
              <span className="theme-icon-sun"><IconSun size={16} /></span>
              <span className="theme-icon-moon"><IconMoon size={16} /></span>
            </label>

            {/* Universal menu button — visible on all breakpoints.
                Previously marked md:hidden which made it appear unresponsive on desktop. */}
            <button
              ref={menuButtonRef}
              type="button"
              className="theme-btn"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="菜单"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="primary-menu"
            >
              {menuOpen ? <IconX size={18} /> : <IconMenu size={18} />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <form onSubmit={handleSearch} className="py-2">
            <input
              autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="搜索疾病、标记物、鉴别诊断..."
              aria-label="搜索疾病、标记物、鉴别诊断"
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            />
          </form>
        )}
      </div>

      {/* Dropdown menu panel (outside inner container so it spans full width below nav) */}
      {menuOpen && (
        <div
          ref={menuRef}
          id="primary-menu"
          role="menu"
          className="absolute left-0 right-0 top-14 shadow-xl animate-scale-in"
          style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 grid gap-4 md:grid-cols-2">
            {/* Mobile primary nav — show NAV links on mobile since they're hidden in the top bar */}
            <div className="md:hidden">
              <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>导航</div>
              <div className="space-y-0.5">
                {NAV.map(({ href, label, icon: Icon }) => {
                  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      role="menuitem"
                      className="flex items-center gap-2.5 px-3 py-3 text-sm rounded-lg"
                      style={{
                        color: active ? 'var(--fg)' : 'var(--fg-muted)',
                        background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                        textDecoration: 'none',
                      }}
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Extras visible on all screen sizes */}
            <div>
              <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>更多</div>
              <div className="space-y-0.5">
                {MENU_EXTRAS.map(({ href, label, icon: Icon, external }) => (
                  external ? (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      role="menuitem"
                      className="menu-item flex items-center gap-2.5 px-3 py-3 text-sm rounded-lg"
                      style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                    </a>
                  ) : (
                    <Link
                      key={href}
                      href={href}
                      role="menuitem"
                      className="menu-item flex items-center gap-2.5 px-3 py-3 text-sm rounded-lg"
                      style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                    </Link>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
