'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconHome, IconMicroscope, IconFlask, IconScale, IconBrain, IconTrophy, IconSearch, IconMenu, IconSun, IconMoon, IconDna } from './Icon';

const NAV = [
  { href: '/', label: '首页', icon: IconHome },
  { href: '/atlas', label: '图谱', icon: IconMicroscope },
  { href: '/markers', label: '标记物', icon: IconFlask },
  { href: '/differentials', label: '鉴别', icon: IconScale },
  { href: '/review', label: '复习', icon: IconBrain },
  { href: '/progress', label: '成就', icon: IconTrophy },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

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
                <Link key={href} href={href} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors" style={{
                  color: active ? 'var(--fg)' : 'var(--fg-muted)',
                  background: active ? 'var(--card-hover)' : 'transparent',
                  textDecoration: 'none',
                }}>
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setSearchOpen(v => !v)} className="theme-btn" title="搜索" aria-label="搜索">
              <IconSearch size={16} />
            </button>

            <label htmlFor="theme-toggle" className="theme-btn" title="切换主题">
              <span className="theme-icon-sun"><IconSun size={16} /></span>
              <span className="theme-icon-moon"><IconMoon size={16} /></span>
            </label>

            <button className="md:hidden theme-btn" onClick={() => setMenuOpen(v => !v)} aria-label="菜单">
              <IconMenu size={18} />
            </button>
          </div>
        </div>

        {searchOpen && (
          <form onSubmit={handleSearch} className="py-2">
            <input
              autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="搜索疾病、标记物、鉴别诊断..."
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            />
          </form>
        )}

        {menuOpen && (
          <div className="md:hidden py-2 space-y-0.5" style={{ borderTop: '1px solid var(--border)' }}>
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-3 text-sm rounded-lg" style={{
                    color: active ? 'var(--fg)' : 'var(--fg-muted)',
                    background: active ? 'var(--card-hover)' : 'transparent',
                    textDecoration: 'none',
                  }}>
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
