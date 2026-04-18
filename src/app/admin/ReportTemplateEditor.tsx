'use client';

/**
 * Visual editor for CAP synoptic report templates.
 * Mirrors the hierarchy: template → sections → fields.
 * Each field has type-specific sub-options (select options, number unit, etc.)
 */

import { useState } from 'react';
import { IconX } from '@/components/Icon';

// ── Types ──────────────────────────────────────────────────

type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'multiselect';

interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  unit?: string;
  placeholder?: string;
  help?: string;
  defaultValue?: unknown;
}

interface TemplateSection {
  id: string;
  title: string;
  fields: TemplateField[];
}

interface ReportTemplate {
  id: string;
  nameZh?: string;
  nameEn?: string;
  capProtocol?: string;
  sections: TemplateSection[];
  [k: string]: unknown;
}

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text', label: '单行文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔 (是/否)' },
  { value: 'select', label: '单选下拉' },
  { value: 'multiselect', label: '多选' },
];

// ── Main component ─────────────────────────────────────────

export function ReportTemplateEditor({
  value,
  onChange,
}: {
  value: ReportTemplate;
  onChange: (v: ReportTemplate) => void;
}) {
  const sections = value.sections || [];

  const updateField = <K extends keyof ReportTemplate>(key: K, v: ReportTemplate[K]) => {
    onChange({ ...value, [key]: v });
  };

  const updateSection = (idx: number, patch: Partial<TemplateSection>) => {
    onChange({ ...value, sections: sections.map((s, i) => i === idx ? { ...s, ...patch } : s) });
  };

  const addSection = () => {
    const newSection: TemplateSection = {
      id: `section-${Date.now()}`,
      title: '新章节',
      fields: [],
    };
    onChange({ ...value, sections: [...sections, newSection] });
  };

  const removeSection = (idx: number) => {
    onChange({ ...value, sections: sections.filter((_, i) => i !== idx) });
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const next = [...sections];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ ...value, sections: next });
  };

  return (
    <div className="space-y-4">
      {/* Template meta */}
      <div className="rounded-xl p-4" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
        <div className="text-xs font-semibold mb-3" style={{ color: 'var(--fg)' }}>模板基本信息</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldInput label="中文名" value={value.nameZh || ''} onChange={v => updateField('nameZh', v)} required />
          <FieldInput label="英文名" value={value.nameEn || ''} onChange={v => updateField('nameEn', v)} />
          <div className="sm:col-span-2">
            <FieldInput label="CAP 协议版本" value={value.capProtocol || ''} onChange={v => updateField('capProtocol', v)} placeholder="例如：Breast Invasive 4.8.0.1" />
          </div>
        </div>
      </div>

      {/* Sections */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>
            章节 ({sections.length})
          </div>
        </div>
        <div className="space-y-3">
          {sections.map((section, sIdx) => (
            <SectionEditor
              key={section.id + sIdx}
              section={section}
              onChange={patch => updateSection(sIdx, patch)}
              onRemove={() => removeSection(sIdx)}
              onMove={dir => moveSection(sIdx, dir)}
              isFirst={sIdx === 0}
              isLast={sIdx === sections.length - 1}
            />
          ))}
          <button
            onClick={addSection}
            className="w-full py-2.5 rounded-lg text-xs font-medium cursor-pointer"
            style={{ background: 'var(--card)', color: 'var(--accent)', border: '1px dashed var(--accent)' }}
          >
            + 添加章节
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section editor ─────────────────────────────────────────

function SectionEditor({
  section, onChange, onRemove, onMove, isFirst, isLast,
}: {
  section: TemplateSection;
  onChange: (p: Partial<TemplateSection>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const fields = section.fields || [];

  const updateField = (idx: number, patch: Partial<TemplateField>) => {
    onChange({ fields: fields.map((f, i) => i === idx ? { ...f, ...patch } : f) });
  };

  const addField = () => {
    const newField: TemplateField = {
      id: `field-${Date.now()}`,
      label: '新字段',
      type: 'text',
    };
    onChange({ fields: [...fields, newField] });
  };

  const removeField = (idx: number) => {
    onChange({ fields: fields.filter((_, i) => i !== idx) });
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    const next = [...fields];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ fields: next });
  };

  return (
    <div className="rounded-xl" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
      {/* Section header */}
      <div className="flex items-center gap-2 p-3" style={{ borderBottom: collapsed ? 'none' : '1px solid var(--border)' }}>
        <button
          onClick={() => setCollapsed(v => !v)}
          className="cursor-pointer"
          style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', transform: collapsed ? '' : 'rotate(90deg)', transition: 'transform 0.2s' }}
        >
          ▶
        </button>
        <input
          type="text"
          value={section.id}
          onChange={e => onChange({ id: e.target.value })}
          placeholder="section-id"
          className="px-2 py-1 rounded text-xs font-mono outline-none"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg-muted)', width: 120 }}
        />
        <input
          type="text"
          value={section.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="章节标题"
          className="flex-1 px-2 py-1 rounded text-sm font-semibold outline-none"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
        />
        <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>
          {fields.length} 字段
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={() => onMove(-1)}
            disabled={isFirst}
            className="px-1.5 py-0.5 rounded text-xs cursor-pointer"
            style={{ background: 'var(--bg)', color: 'var(--fg-muted)', border: '1px solid var(--border)', opacity: isFirst ? 0.4 : 1 }}
          >
            ↑
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={isLast}
            className="px-1.5 py-0.5 rounded text-xs cursor-pointer"
            style={{ background: 'var(--bg)', color: 'var(--fg-muted)', border: '1px solid var(--border)', opacity: isLast ? 0.4 : 1 }}
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            className="px-2 py-0.5 rounded text-xs cursor-pointer"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            删除章节
          </button>
        </div>
      </div>

      {/* Fields */}
      {!collapsed && (
        <div className="p-3 space-y-2">
          {fields.map((field, fIdx) => (
            <FieldEditor
              key={field.id + fIdx}
              field={field}
              onChange={patch => updateField(fIdx, patch)}
              onRemove={() => removeField(fIdx)}
              onMove={dir => moveField(fIdx, dir)}
              isFirst={fIdx === 0}
              isLast={fIdx === fields.length - 1}
            />
          ))}
          <button
            onClick={addField}
            className="w-full py-2 rounded-md text-xs font-medium cursor-pointer"
            style={{ background: 'var(--bg)', color: 'var(--accent)', border: '1px dashed var(--border)' }}
          >
            + 添加字段
          </button>
        </div>
      )}
    </div>
  );
}

// ── Field editor ───────────────────────────────────────────

function FieldEditor({
  field, onChange, onRemove, onMove, isFirst, isLast,
}: {
  field: TemplateField;
  onChange: (p: Partial<TemplateField>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const needsOptions = field.type === 'select' || field.type === 'multiselect';
  const needsUnit = field.type === 'number';

  return (
    <div className="rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
      {/* Compact row */}
      <div className="flex items-center gap-2 p-2">
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-[10px] cursor-pointer px-1"
          style={{ color: 'var(--fg-muted)', background: 'none', border: 'none' }}
        >
          {expanded ? '▼' : '▶'}
        </button>
        <input
          type="text"
          value={field.id}
          onChange={e => onChange({ id: e.target.value })}
          placeholder="field-id"
          className="px-2 py-1 rounded text-xs font-mono outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg-muted)', width: 140 }}
        />
        <input
          type="text"
          value={field.label}
          onChange={e => onChange({ label: e.target.value })}
          placeholder="字段标签"
          className="flex-1 px-2 py-1 rounded text-xs outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }}
        />
        <select
          value={field.type}
          onChange={e => onChange({ type: e.target.value as FieldType })}
          className="px-2 py-1 rounded text-xs outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }}
        >
          {FIELD_TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-[10px] cursor-pointer" style={{ color: field.required ? '#ef4444' : 'var(--fg-muted)' }}>
          <input
            type="checkbox"
            checked={!!field.required}
            onChange={e => onChange({ required: e.target.checked })}
            style={{ accentColor: '#ef4444' }}
          />
          必填
        </label>
        <div className="flex gap-0.5">
          <button
            onClick={() => onMove(-1)}
            disabled={isFirst}
            className="px-1 py-0.5 rounded text-[10px] cursor-pointer"
            style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)', border: '1px solid var(--border)', opacity: isFirst ? 0.4 : 1 }}
          >
            ↑
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={isLast}
            className="px-1 py-0.5 rounded text-[10px] cursor-pointer"
            style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)', border: '1px solid var(--border)', opacity: isLast ? 0.4 : 1 }}
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            className="px-1.5 py-0.5 rounded text-[10px] cursor-pointer"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <FieldInput
              label="占位提示"
              value={field.placeholder || ''}
              onChange={v => onChange({ placeholder: v })}
              small
            />
            <FieldInput
              label="帮助说明"
              value={field.help || ''}
              onChange={v => onChange({ help: v })}
              small
            />
          </div>

          {needsUnit && (
            <FieldInput
              label="单位 (如：cm / mm / % )"
              value={field.unit || ''}
              onChange={v => onChange({ unit: v })}
              small
            />
          )}

          {needsOptions && (
            <OptionsEditor
              options={field.options || []}
              onChange={v => onChange({ options: v })}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Options editor for select/multiselect ──────────────────

function OptionsEditor({
  options, onChange,
}: {
  options: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...options, v]);
    setDraft('');
  };

  const removeAt = (i: number) => {
    onChange(options.filter((_, idx) => idx !== i));
  };

  const moveAt = (i: number, dir: -1 | 1) => {
    const next = [...options];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    onChange(next);
  };

  return (
    <div>
      <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>
        选项列表 (下拉 / 多选专用)
      </label>
      {options.length > 0 && (
        <div className="space-y-1 mb-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-[10px] font-mono px-1" style={{ color: 'var(--fg-muted)' }}>{i + 1}.</span>
              <input
                type="text"
                value={opt}
                onChange={e => onChange(options.map((o, idx) => idx === i ? e.target.value : o))}
                className="flex-1 px-2 py-1 rounded text-xs outline-none"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
              <button onClick={() => moveAt(i, -1)} disabled={i === 0} className="px-1 py-0.5 rounded text-[10px] cursor-pointer"
                style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)', border: '1px solid var(--border)', opacity: i === 0 ? 0.4 : 1 }}>↑</button>
              <button onClick={() => moveAt(i, 1)} disabled={i === options.length - 1} className="px-1 py-0.5 rounded text-[10px] cursor-pointer"
                style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)', border: '1px solid var(--border)', opacity: i === options.length - 1 ? 0.4 : 1 }}>↓</button>
              <button onClick={() => removeAt(i)} className="p-1 rounded cursor-pointer"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                <IconX size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="回车添加新选项"
          className="flex-1 px-2 py-1 rounded text-xs outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }}
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="px-3 py-1 rounded text-xs font-medium cursor-pointer"
          style={{ background: 'var(--accent)', color: '#fff', opacity: draft.trim() ? 1 : 0.4 }}
        >
          添加
        </button>
      </div>
    </div>
  );
}

// ── Small field input helper ───────────────────────────────

function FieldInput({
  label, value, onChange, placeholder, required, small,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium mb-0.5" style={{ color: 'var(--fg-muted)' }}>
        {label}{required && <span className="ml-0.5" style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded outline-none ${small ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}`}
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
      />
    </div>
  );
}
