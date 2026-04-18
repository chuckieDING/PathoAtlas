'use client';

/**
 * Fuzzy-searchable selector for entity references (disease / marker / glossary-term).
 * Replaces raw string-array inputs where users would otherwise need to
 * manually type IDs. Provides:
 * - Chip display showing the resolved Chinese name for already-selected refs
 * - Search input that matches id, nameZh, nameEn, abbreviation
 * - Dropdown with the top matches
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconX } from '@/components/Icon';

export type EntityType = 'disease' | 'marker' | 'glossary-term';

export interface EntityRef {
  id: string;
  nameZh: string;
  nameEn: string;
  abbreviation?: string;
  /** organ id (for diseases), category (for markers) — secondary info shown in chips/dropdown */
  subtitle?: string;
}

// ── Per-type data loader ───────────────────────────────────

const cache: Partial<Record<EntityType, EntityRef[]>> = {};
const pending: Partial<Record<EntityType, Promise<EntityRef[]>>> = {};

async function loadEntities(type: EntityType): Promise<EntityRef[]> {
  if (cache[type]) return cache[type]!;
  if (pending[type]) return pending[type]!;

  pending[type] = (async () => {
    try {
      let url = '';
      if (type === 'disease') url = '/api/all-diseases';
      else if (type === 'marker') url = '/api/markers';
      else if (type === 'glossary-term') url = '/api/glossary';

      const data = await fetch(url, { cache: 'no-store' }).then(r => r.json());
      if (!Array.isArray(data)) return [];

      const mapped: EntityRef[] = data.map((e: any) => {
        if (type === 'disease') {
          return {
            id: e.id,
            nameZh: e.nameZh || '',
            nameEn: e.nameEn || '',
            subtitle: e.organ,
          };
        }
        if (type === 'marker') {
          return {
            id: e.id,
            nameZh: e.nameZh || '',
            nameEn: e.nameEn || '',
            abbreviation: e.abbreviation,
            subtitle: e.category,
          };
        }
        // glossary
        return {
          id: e.id,
          nameZh: e.termZh || e.nameZh || '',
          nameEn: e.termEn || e.nameEn || '',
          subtitle: e.category,
        };
      });
      cache[type] = mapped;
      return mapped;
    } finally {
      delete pending[type];
    }
  })();
  return pending[type]!;
}

function entityLabel(e: EntityRef): string {
  if (e.abbreviation) return `${e.abbreviation} · ${e.nameZh || e.nameEn}`;
  return e.nameZh || e.nameEn || e.id;
}

// ── Single ref selector (for scalar fields like flowchart.relatedDifferentialId) ──

export function EntityRefSelector({
  entityType,
  value,
  onChange,
  placeholder,
}: {
  entityType: EntityType;
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [entities, setEntities] = useState<EntityRef[]>(cache[entityType] || []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadEntities(entityType).then(setEntities);
  }, [entityType]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = entities.find(e => e.id === value);
  const matches = useMemo(() => filterEntities(entities, query, []).slice(0, 20), [entities, query]);

  return (
    <div ref={rootRef} className="relative">
      <div
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-text"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
      >
        {selected ? (
          <div className="flex-1 flex items-center gap-2 text-sm">
            <span style={{ color: 'var(--fg)' }}>{entityLabel(selected)}</span>
            <code className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>{selected.id}</code>
          </div>
        ) : (
          <span className="flex-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
            {value || placeholder || '点击选择...'}
          </span>
        )}
        {value && (
          <button
            onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); }}
            className="p-0.5 cursor-pointer"
            style={{ color: 'var(--fg-muted)', background: 'none', border: 'none' }}
          >
            <IconX size={12} />
          </button>
        )}
      </div>
      {open && (
        <Dropdown
          entities={matches}
          query={query}
          setQuery={setQuery}
          onPick={(id) => { onChange(id); setOpen(false); setQuery(''); }}
          autofocus
        />
      )}
    </div>
  );
}

// ── Array ref selector (main component for differentialDiagnosis etc.) ──

export function EntityRefArraySelector({
  entityType,
  values,
  onChange,
  placeholder,
  label,
}: {
  entityType: EntityType;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  label?: string;
}) {
  const [entities, setEntities] = useState<EntityRef[]>(cache[entityType] || []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadEntities(entityType).then(setEntities);
  }, [entityType]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedEntities = values.map(id => entities.find(e => e.id === id) || { id, nameZh: '', nameEn: '', subtitle: undefined } as EntityRef);
  const matches = useMemo(() => filterEntities(entities, query, values).slice(0, 20), [entities, query, values]);

  const add = (id: string) => {
    if (!values.includes(id)) onChange([...values, id]);
    setQuery('');
  };
  const remove = (id: string) => onChange(values.filter(v => v !== id));

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--fg-muted)' }}>
          {label}
        </div>
      )}
      {/* Selected chips */}
      {selectedEntities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedEntities.map(e => {
            const unknown = !e.nameZh && !e.nameEn;
            return (
              <span
                key={e.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                style={{
                  background: unknown ? 'rgba(239,68,68,0.1)' : 'var(--card-hover)',
                  color: unknown ? '#ef4444' : 'var(--fg)',
                  border: `1px solid ${unknown ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                }}
                title={unknown ? `ID "${e.id}" 未在索引中找到` : `${e.nameEn || ''} · ${e.id}`}
              >
                <span>{unknown ? `⚠ ${e.id}` : entityLabel(e)}</span>
                <button
                  onClick={() => remove(e.id)}
                  className="cursor-pointer"
                  style={{ color: unknown ? '#ef4444' : 'var(--fg-muted)', background: 'none', border: 'none' }}
                  aria-label="移除"
                >
                  <IconX size={10} />
                </button>
              </span>
            );
          })}
        </div>
      )}
      {/* Search input */}
      <div
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-text"
        style={{ background: 'var(--bg)', border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}` }}
      >
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || '搜索名称 / ID / 英文名添加...'}
          className="flex-1 text-xs outline-none bg-transparent"
          style={{ color: 'var(--fg)' }}
        />
      </div>
      {/* Dropdown */}
      {open && (
        <Dropdown
          entities={matches}
          query={query}
          setQuery={setQuery}
          onPick={add}
          selectedIds={values}
        />
      )}
    </div>
  );
}

// ── Shared dropdown ────────────────────────────────────────

function Dropdown({
  entities, query, setQuery, onPick, autofocus, selectedIds,
}: {
  entities: EntityRef[];
  query: string;
  setQuery: (q: string) => void;
  onPick: (id: string) => void;
  autofocus?: boolean;
  selectedIds?: string[];
}) {
  return (
    <div
      className="absolute left-0 right-0 top-full mt-1 rounded-xl max-h-72 overflow-y-auto"
      style={{ background: 'var(--card)', border: '1px solid var(--border)', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
    >
      {autofocus && (
        <div className="p-2 sticky top-0" style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索..."
            className="w-full px-2 py-1.5 rounded text-xs outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          />
        </div>
      )}
      {entities.length === 0 ? (
        <div className="p-3 text-xs text-center" style={{ color: 'var(--fg-muted)' }}>
          {query.trim() ? `"${query}" 无匹配` : '输入关键词搜索'}
        </div>
      ) : (
        <ul>
          {entities.map(e => {
            const alreadySelected = selectedIds?.includes(e.id);
            return (
              <li key={e.id}>
                <button
                  onClick={() => !alreadySelected && onPick(e.id)}
                  disabled={alreadySelected}
                  className="w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer"
                  style={{
                    background: alreadySelected ? 'var(--card-hover)' : 'transparent',
                    color: alreadySelected ? 'var(--fg-muted)' : 'var(--fg)',
                  }}
                  onMouseEnter={ev => {
                    if (!alreadySelected) (ev.currentTarget as HTMLElement).style.background = 'var(--card-hover)';
                  }}
                  onMouseLeave={ev => {
                    if (!alreadySelected) (ev.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium flex-1">{entityLabel(e)}</span>
                    {alreadySelected && <span className="text-[10px]">已选</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>{e.id}</code>
                    {e.nameEn && <span className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>{e.nameEn}</span>}
                    {e.subtitle && <span className="text-[10px] px-1 rounded" style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}>{e.subtitle}</span>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Fuzzy filter ───────────────────────────────────────────

function filterEntities(entities: EntityRef[], query: string, exclude: string[]): EntityRef[] {
  const q = query.trim().toLowerCase();
  const excl = new Set(exclude);
  if (!q) return entities.filter(e => !excl.has(e.id)).slice(0, 50);
  return entities.filter(e => {
    if (excl.has(e.id)) return false;
    return (
      e.id.toLowerCase().includes(q) ||
      (e.nameZh || '').toLowerCase().includes(q) ||
      (e.nameEn || '').toLowerCase().includes(q) ||
      (e.abbreviation || '').toLowerCase().includes(q) ||
      (e.subtitle || '').toLowerCase().includes(q)
    );
  });
}
