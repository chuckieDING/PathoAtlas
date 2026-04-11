'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { href: '/', label: '首页', icon: '🏠' },
  { href: '/atlas', label: '图谱', icon: '🔬' },
  { href: '/markers', label: '标记物', icon: '🧪' },
  { href: '/differentials', label: '鉴别诊断', icon: '⚖️' },
  { href: '/review', label: '复习', icon: '📝' },
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
          <Link href="/" className="font-bold text-lg flex-shrink-0" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            🧬 PathoAtlas
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 text-sm">
            {NAV.map(({ href, label, icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link key={href} href={href} className="px-3 py-1.5 rounded-lg transition-colors" style={{
                  color: active ? 'var(--fg)' : 'var(--fg-muted)',
                  background: active ? 'var(--card-hover)' : 'transparent',
                  textDecoration: 'none',
                }}>
                  <span className="mr-1">{icon}</span>{label}
                </Link>
              );
            })}
          </div>

          {/* Right: search + theme + mobile menu */}
          <div className="flex items-center gap-2">
            {/* Search button */}
            <button onClick={() => setSearchOpen(v => !v)} className="theme-btn" title="搜索">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>

            {/* Theme toggle */}
            <label htmlFor="theme-toggle" className="theme-btn" title="切换主题">
              <svg className="theme-icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              <svg className="theme-icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </label>

            {/* Mobile hamburger */}
            <button className="md:hidden theme-btn" onClick={() => setMenuOpen(v => !v)} aria-label="菜单">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Search bar */}
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

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-2 space-y-0.5" style={{ borderTop: '1px solid var(--border)' }}>
            {NAV.map(({ href, label, icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-3 text-sm rounded-lg" style={{
                    color: active ? 'var(--fg)' : 'var(--fg-muted)',
                    background: active ? 'var(--card-hover)' : 'transparent',
                    textDecoration: 'none',
                  }}>
                  <span>{icon}</span>{label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
