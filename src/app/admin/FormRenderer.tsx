'use client';

/**
 * Generic schema-driven form renderer.
 * Takes a ModuleSchema + a value object, renders form inputs for each field,
 * and calls onChange with the updated value.
 *
 * Supports: text, textarea, select, number, string-array (tag input),
 * object-array (nested row forms).
 */

import { useState } from 'react';
import { IconX } from '@/components/Icon';
import { ColorField } from './ColorField';
import type { FieldDef, ModuleSchema } from './contentSchemas';

interface FormProps {
  schema: ModuleSchema;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}

// ── Main form ──────────────────────────────────────────────

export function FormRenderer({ schema, value, onChange }: FormProps) {
  const setField = (key: string, v: unknown) => {
    onChange({ ...value, [key]: v });
  };

  return (
    <div className="space-y-4">
      {schema.fields.map(field => (
        <FieldRow
          key={field.key}
          field={field}
          value={value[field.key]}
          onChange={v => setField(field.key, v)}
        />
      ))}
    </div>
  );
}

// ── Single field ───────────────────────────────────────────

function FieldRow({
  field, value, onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg)' }}>
        {field.label}
        {field.required && <span className="ml-0.5" style={{ color: '#ef4444' }}>*</span>}
      </label>
      <FieldInput field={field} value={value} onChange={onChange} />
      {field.help && (
        <p className="text-[10px] mt-1" style={{ color: 'var(--fg-muted)' }}>{field.help}</p>
      )}
    </div>
  );
}

// ── Input by type ──────────────────────────────────────────

function FieldInput({
  field, value, onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const baseInputStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--fg)',
  };

  if (field.type === 'text') {
    return (
      <input
        type="text"
        value={(value as string) || ''}
        placeholder={field.placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={baseInputStyle}
      />
    );
  }

  if (field.type === 'number') {
    return (
      <input
        type="number"
        value={(value as number | string) ?? ''}
        placeholder={field.placeholder}
        onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={baseInputStyle}
      />
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        value={(value as string) || ''}
        placeholder={field.placeholder}
        rows={field.rows || 3}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-y"
        style={baseInputStyle}
      />
    );
  }

  if (field.type === 'color') {
    return (
      <ColorField
        value={(value as string) || ''}
        onChange={onChange}
        placeholder={field.placeholder}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <select
        value={(value as string) || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={baseInputStyle}
      >
        <option value="">-- 选择 --</option>
        {field.options?.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'string-array') {
    return <StringArrayInput value={(value as string[]) || []} onChange={onChange} placeholder={field.placeholder} />;
  }

  if (field.type === 'object-array') {
    return <ObjectArrayInput
      value={(value as Record<string, unknown>[]) || []}
      onChange={onChange}
      itemSchema={field.itemSchema || []}
    />;
  }

  return null;
}

// ── String-array (tag input) ───────────────────────────────

function StringArrayInput({
  value, onChange, placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft('');
  };

  const removeAt = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
            style={{ background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border)' }}
          >
            <span>{item}</span>
            <button
              onClick={() => removeAt(i)}
              className="hover:opacity-70 cursor-pointer"
              style={{ color: 'var(--fg-muted)', background: 'none', border: 'none' }}
              aria-label="删除"
            >
              <IconX size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={draft}
          placeholder={placeholder || '回车添加...'}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          className="flex-1 px-3 py-1.5 rounded-md text-xs outline-none"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
          style={{ background: 'var(--accent)', color: '#fff', opacity: draft.trim() ? 1 : 0.4 }}
        >
          添加
        </button>
      </div>
    </div>
  );
}

// ── Object-array (nested rows) ─────────────────────────────

function ObjectArrayInput({
  value, onChange, itemSchema,
}: {
  value: Record<string, unknown>[];
  onChange: (v: Record<string, unknown>[]) => void;
  itemSchema: FieldDef[];
}) {
  const addRow = () => {
    const newRow: Record<string, unknown> = {};
    for (const f of itemSchema) {
      newRow[f.key] = f.type === 'string-array' ? [] : f.type === 'number' ? 0 : '';
    }
    onChange([...value, newRow]);
  };

  const updateRow = (i: number, row: Record<string, unknown>) => {
    onChange(value.map((r, idx) => (idx === i ? row : r)));
  };

  const removeRow = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  const moveRow = (i: number, dir: -1 | 1) => {
    const next = [...value];
    const target = i + dir;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div
          key={i}
          className="rounded-lg p-3"
          style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold" style={{ color: 'var(--fg-muted)' }}>
              #{i + 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => moveRow(i, -1)}
                disabled={i === 0}
                className="px-1.5 py-0.5 rounded text-[10px] cursor-pointer"
                style={{ background: 'var(--bg)', color: 'var(--fg-muted)', border: '1px solid var(--border)', opacity: i === 0 ? 0.4 : 1 }}
              >
                ↑
              </button>
              <button
                onClick={() => moveRow(i, 1)}
                disabled={i === value.length - 1}
                className="px-1.5 py-0.5 rounded text-[10px] cursor-pointer"
                style={{ background: 'var(--bg)', color: 'var(--fg-muted)', border: '1px solid var(--border)', opacity: i === value.length - 1 ? 0.4 : 1 }}
              >
                ↓
              </button>
              <button
                onClick={() => removeRow(i)}
                className="px-1.5 py-0.5 rounded text-[10px] cursor-pointer"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                删除
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {itemSchema.map(subField => (
              <div key={subField.key} className={
                subField.type === 'textarea' || subField.type === 'string-array' || subField.type === 'object-array'
                  ? 'sm:col-span-2'
                  : ''
              }>
                <label className="block text-[10px] font-medium mb-0.5" style={{ color: 'var(--fg-muted)' }}>
                  {subField.label}
                  {subField.required && <span className="ml-0.5" style={{ color: '#ef4444' }}>*</span>}
                </label>
                <FieldInput
                  field={subField}
                  value={row[subField.key]}
                  onChange={v => updateRow(i, { ...row, [subField.key]: v })}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={addRow}
        className="w-full py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors"
        style={{ background: 'var(--card)', color: 'var(--accent)', border: '1px dashed var(--accent)' }}
      >
        + 添加一行
      </button>
    </div>
  );
}
