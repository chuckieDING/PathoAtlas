'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { IconSearch, IconX, IconChevronDown, IconBookOpen } from '@/components/Icon';

interface GlossaryTerm {
  id: string;
  termZh: string;
  termEn: string;
  definition: string;
  category: string;
  relatedTerms: string[];
  synonyms: string[];
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const CATEGORY_COLORS: Record<string, string> = {
  '基础病理': '#6366f1',
  '肿瘤总论': '#e11d48',
  '组织学技术': '#0891b2',
  '免疫组化': '#7c3aed',
  '分子病理': '#059669',
  '细胞病理': '#d97706',
  '解剖病理': '#2563eb',
  '临床病理相关': '#9333ea',
};

export default function GlossaryPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/glossary')
      .then((r) => r.json())
      .then((data: GlossaryTerm[]) => {
        setTerms(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(terms.map((t) => t.category))),
    [terms],
  );

  const filtered = useMemo(() => {
    let result = terms;
    if (activeCategory) {
      result = result.filter((t) => t.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.termZh.toLowerCase().includes(q) ||
          t.termEn.toLowerCase().includes(q) ||
          t.definition.toLowerCase().includes(q),
      );
    }
    return result;
  }, [terms, search, activeCategory]);

  const letterGroups = useMemo(() => {
    const groups: Record<string, GlossaryTerm[]> = {};
    for (const t of filtered) {
      const letter = t.termEn.charAt(0).toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(t);
    }
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.termEn.localeCompare(b.termEn));
    }
    return groups;
  }, [filtered]);

  const scrollToLetter = (letter: string) => {
    const el = document.getElementById(`letter-${letter}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resolveTermName = (id: string): string => {
    const found = terms.find((t) => t.id === id);
    return found ? `${found.termZh} (${found.termEn})` : id;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ color: 'var(--fg-muted)', fontSize: 18 }}>Loading glossary...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <IconBookOpen size={28} style={{ color: 'var(--accent)' }} />
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>
            病理学术语表
          </h1>
        </div>
        <p style={{ color: 'var(--fg-muted)', margin: 0 }}>
          共收录 {terms.length} 个病理学专业术语，涵盖 {categories.length} 个分类
        </p>
      </div>

      {/* Search */}
      <div
        style={{
          position: 'relative',
          marginBottom: '1.5rem',
        }}
      >
        <IconSearch
          size={18}
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--fg-muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="搜索术语（中文 / English）..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 40px 12px 42px',
            border: '1px solid var(--border)',
            borderRadius: 10,
            background: 'var(--card)',
            color: 'var(--fg)',
            fontSize: 16,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--fg-muted)',
              padding: 0,
              display: 'flex',
            }}
          >
            <IconX size={18} />
          </button>
        )}
      </div>

      {/* Alphabet index */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          marginBottom: '1rem',
        }}
      >
        {ALPHABET.map((letter) => {
          const has = !!letterGroups[letter];
          return (
            <button
              key={letter}
              onClick={() => has && scrollToLetter(letter)}
              disabled={!has}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: has ? 'var(--card)' : 'transparent',
                color: has ? 'var(--accent)' : 'var(--fg-muted)',
                fontWeight: has ? 700 : 400,
                fontSize: 13,
                cursor: has ? 'pointer' : 'default',
                opacity: has ? 1 : 0.35,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Category filter chips */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: '2rem',
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'thin',
        }}
      >
        <button
          onClick={() => setActiveCategory(null)}
          style={{
            padding: '6px 16px',
            borderRadius: 20,
            border: '1px solid var(--border)',
            background: !activeCategory ? 'var(--accent)' : 'var(--card)',
            color: !activeCategory ? '#fff' : 'var(--fg)',
            fontSize: 14,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontWeight: !activeCategory ? 600 : 400,
          }}
        >
          全部
        </button>
        {categories.map((cat) => {
          const active = activeCategory === cat;
          const catColor = CATEGORY_COLORS[cat] || 'var(--accent)';
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(active ? null : cat)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: `1px solid ${active ? catColor : 'var(--border)'}`,
                background: active ? catColor : 'var(--card)',
                color: active ? '#fff' : 'var(--fg)',
                fontSize: 14,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: active ? 600 : 400,
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginBottom: '1rem' }}>
        显示 {filtered.length} 个术语
      </p>

      {/* Term cards by letter */}
      {ALPHABET.filter((l) => letterGroups[l]).map((letter) => (
        <div key={letter} id={`letter-${letter}`} style={{ marginBottom: '2rem' }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--accent)',
              borderBottom: '2px solid var(--border)',
              paddingBottom: 4,
              marginBottom: 12,
            }}
          >
            {letter}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 12,
            }}
          >
            {letterGroups[letter].map((term) => {
              const isExpanded = expandedId === term.id;
              const catColor = CATEGORY_COLORS[term.category] || 'var(--accent)';
              return (
                <div
                  key={term.id}
                  onClick={() => setExpandedId(isExpanded ? null : term.id)}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'box-shadow 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  }}
                >
                  {/* Card header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--fg)', lineHeight: 1.3 }}>
                        {term.termZh}
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--fg-muted)', marginTop: 2 }}>
                        {term.termEn}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        padding: '2px 10px',
                        borderRadius: 12,
                        background: `${catColor}18`,
                        color: catColor,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        marginLeft: 8,
                        flexShrink: 0,
                      }}
                    >
                      {term.category}
                    </span>
                  </div>

                  {/* Definition */}
                  <div
                    style={{
                      fontSize: 14,
                      color: 'var(--fg-muted)',
                      lineHeight: 1.6,
                      ...(isExpanded
                        ? {}
                        : {
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical' as const,
                            overflow: 'hidden',
                          }),
                    }}
                  >
                    {term.definition}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      {term.synonyms.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>同义词：</span>
                          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                            {term.synonyms.join('、')}
                          </span>
                        </div>
                      )}
                      {term.relatedTerms.length > 0 && (
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>相关术语：</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                            {term.relatedTerms.map((rt) => (
                              <span
                                key={rt}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSearch('');
                                  setActiveCategory(null);
                                  setExpandedId(rt);
                                  const el = document.getElementById(`letter-${rt.charAt(0).toUpperCase()}`);
                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                                style={{
                                  fontSize: 12,
                                  padding: '2px 10px',
                                  borderRadius: 12,
                                  background: 'var(--accent)',
                                  color: '#fff',
                                  cursor: 'pointer',
                                }}
                              >
                                {resolveTermName(rt)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expand indicator */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                    <IconChevronDown
                      size={16}
                      style={{
                        color: 'var(--fg-muted)',
                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--fg-muted)' }}>
          <p style={{ fontSize: 18 }}>未找到匹配的术语</p>
          <p style={{ fontSize: 14 }}>请尝试不同的搜索词或分类筛选</p>
        </div>
      )}
    </div>
  );
}
