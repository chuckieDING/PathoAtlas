'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  IconMicroscope, IconFlask, IconScale, IconBookOpen,
  IconChevronDown, IconChevronRight, IconStar, IconTarget,
} from '@/components/Icon';

interface CurriculumItem {
  type: 'disease' | 'marker' | 'differential';
  id: string;
  organ?: string;
}

interface Module {
  id: string;
  titleZh: string;
  items: CurriculumItem[];
}

interface YearPath {
  id: string;
  titleZh: string;
  titleEn?: string;
  description: string;
  modules: Module[];
}

interface SpecialtyPath {
  id: string;
  titleZh: string;
  titleEn?: string;
  organ: string;
  description: string;
  modules: Module[];
}

interface Curriculum {
  yearPaths: YearPath[];
  specialtyPaths: SpecialtyPath[];
}

function itemHref(item: CurriculumItem): string {
  switch (item.type) {
    case 'disease':
      return `/atlas/${item.organ}/${item.id}`;
    case 'marker':
      return `/markers/${item.id}`;
    case 'differential':
      return `/differentials#${item.id}`;
  }
}

function ItemIcon({ type }: { type: CurriculumItem['type'] }) {
  switch (type) {
    case 'disease':
      return <IconMicroscope size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />;
    case 'marker':
      return <IconFlask size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />;
    case 'differential':
      return <IconScale size={14} style={{ color: 'var(--warning)', flexShrink: 0 }} />;
  }
}

function typeLabel(type: CurriculumItem['type']): string {
  switch (type) {
    case 'disease': return '疾病';
    case 'marker': return '标记物';
    case 'differential': return '鉴别诊断';
  }
}

function ModuleCard({ mod, defaultOpen }: { mod: Module; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer"
        style={{ color: 'var(--fg)' }}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <IconTarget size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span className="font-semibold text-sm truncate">{mod.titleZh}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--border)', color: 'var(--fg-muted)' }}
          >
            {mod.items.length}
          </span>
        </div>
        {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-1.5" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="pt-3" />
          {mod.items.map((item, i) => (
            <Link
              key={`${item.type}-${item.id}-${i}`}
              href={itemHref(item)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ color: 'var(--fg)', background: 'transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <ItemIcon type={item.type} />
              <span className="truncate">{item.id}</span>
              <span
                className="ml-auto text-xs px-1.5 py-0.5 rounded"
                style={{ color: 'var(--fg-muted)', background: 'var(--border)' }}
              >
                {typeLabel(item.type)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CurriculumPage() {
  const [data, setData] = useState<Curriculum | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<'year' | 'specialty'>('year');
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    fetch('/api/curriculum')
      .then((r) => r.json())
      .then((d: Curriculum) => {
        setData(d);
        if (d.yearPaths.length > 0) setSelectedId(d.yearPaths[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center" style={{ color: 'var(--fg-muted)' }}>
        加载中...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center" style={{ color: 'var(--fg-muted)' }}>
        暂无课程数据
      </div>
    );
  }

  const paths = section === 'year' ? data.yearPaths : data.specialtyPaths;
  const selected = paths.find((p) => p.id === selectedId) || paths[0];

  function handleSectionChange(s: 'year' | 'specialty') {
    setSection(s);
    const newPaths = s === 'year' ? data!.yearPaths : data!.specialtyPaths;
    if (newPaths.length > 0) setSelectedId(newPaths[0].id);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
        <IconBookOpen size={24} style={{ color: 'var(--accent)' }} />
        学习路径
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
        系统化病理学习方案，从基础到专科
      </p>

      {/* Section tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'year' as const, label: '按年级' },
          { key: 'specialty' as const, label: '按专科' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => handleSectionChange(t.key)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer"
            style={{
              background: section === t.key ? 'var(--accent)' : 'var(--card)',
              color: section === t.key ? '#fff' : 'var(--fg-muted)',
              border: section === t.key ? 'none' : '1px solid var(--border)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar - desktop: left column, mobile: horizontal scroll */}
        <div className="lg:w-64 flex-shrink-0">
          {/* Mobile: horizontal tabs */}
          <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {paths.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="whitespace-nowrap px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
                style={{
                  background: selected?.id === p.id ? 'var(--accent)' : 'var(--card)',
                  color: selected?.id === p.id ? '#fff' : 'var(--fg)',
                  border: `1px solid ${selected?.id === p.id ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {p.titleZh}
              </button>
            ))}
          </div>

          {/* Desktop: vertical list */}
          <div className="hidden lg:flex flex-col gap-1.5">
            {paths.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="text-left px-4 py-3 rounded-xl text-sm transition-colors cursor-pointer"
                style={{
                  background: selected?.id === p.id ? 'var(--accent)' : 'var(--card)',
                  color: selected?.id === p.id ? '#fff' : 'var(--fg)',
                  border: `1px solid ${selected?.id === p.id ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                <div className="font-semibold">{p.titleZh}</div>
                {'titleEn' in p && p.titleEn && (
                  <div className="text-xs mt-0.5 opacity-70">{p.titleEn}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        {selected && (
          <div className="flex-1 min-w-0">
            <div
              className="rounded-2xl border p-6 mb-6"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--fg)' }}>
                {selected.titleZh}
              </h2>
              {'titleEn' in selected && (selected as YearPath).titleEn && (
                <p className="text-xs mb-2" style={{ color: 'var(--fg-muted)' }}>
                  {(selected as YearPath).titleEn}
                </p>
              )}
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                {selected.description}
              </p>
              <div className="flex gap-4 mt-3 text-xs" style={{ color: 'var(--fg-muted)' }}>
                <span>{selected.modules.length} 个模块</span>
                <span>
                  {selected.modules.reduce((sum, m) => sum + m.items.length, 0)} 个学习项目
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {selected.modules.map((mod, i) => (
                <ModuleCard key={mod.id} mod={mod} defaultOpen={i === 0} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
