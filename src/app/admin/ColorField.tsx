'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * Color picker field used by FormRenderer. Provides:
 * - Preset swatch palette (project-wide standard colors)
 * - Hex code input with validation
 * - Color preview swatch
 */

/** Standard palette reusing CSS variables and common UI accent colors. */
const PRESET_COLORS: { value: string; name: string }[] = [
  { value: '#6366f1', name: 'Indigo (accent)' },
  { value: '#8b5cf6', name: 'Violet' },
  { value: '#ec4899', name: 'Pink' },
  { value: '#ef4444', name: 'Red (danger)' },
  { value: '#f97316', name: 'Orange' },
  { value: '#f59e0b', name: 'Amber (warning)' },
  { value: '#eab308', name: 'Yellow' },
  { value: '#22c55e', name: 'Green (success)' },
  { value: '#14b8a6', name: 'Teal' },
  { value: '#06b6d4', name: 'Cyan' },
  { value: '#3b82f6', name: 'Blue' },
  { value: '#6b7280', name: 'Gray' },
  { value: '#18181b', name: 'Black' },
  { value: '#ffffff', name: 'White' },
];

function isValidHex(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

export function ColorField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value || '');
  const rootRef = useRef<HTMLDivElement>(null);

  // Sync input from external value changes
  useEffect(() => {
    setInput(value || '');
  }, [value]);

  // Close palette on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const commit = (v: string) => {
    const trimmed = v.trim();
    if (trimmed === '' || isValidHex(trimmed)) {
      onChange(trimmed);
    }
  };

  const valid = !input || isValidHex(input);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex gap-2 items-center">
        {/* Swatch preview — click to toggle palette */}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="w-9 h-9 rounded-lg flex-shrink-0 cursor-pointer transition-all hover:scale-105"
          style={{
            background: valid && value ? value : 'var(--card-hover)',
            border: `2px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          }}
          aria-label="打开色板"
        />
        {/* Hex input */}
        <input
          type="text"
          value={input}
          placeholder={placeholder || '#6366f1'}
          onChange={e => {
            setInput(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => commit(input)}
          className="flex-1 px-3 py-2 rounded-lg text-sm font-mono outline-none"
          style={{
            background: 'var(--bg)',
            border: `1px solid ${valid ? 'var(--border)' : '#ef4444'}`,
            color: 'var(--fg)',
          }}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setInput(''); }}
            className="text-xs px-2 py-1.5 rounded-md cursor-pointer"
            style={{ color: 'var(--fg-muted)', background: 'var(--card-hover)', border: '1px solid var(--border)' }}
          >
            清除
          </button>
        )}
      </div>

      {/* Palette dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1 rounded-xl p-3 shadow-lg"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', zIndex: 50, width: 260 }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>
            预设色板
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {PRESET_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  onChange(c.value);
                  setInput(c.value);
                  setOpen(false);
                }}
                title={`${c.name} (${c.value})`}
                className="w-8 h-8 rounded-md cursor-pointer transition-transform hover:scale-110"
                style={{
                  background: c.value,
                  border: value === c.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                }}
              />
            ))}
          </div>
          <div className="text-[10px] mt-3" style={{ color: 'var(--fg-muted)' }}>
            点击色块应用，或直接输入 hex code
          </div>
        </div>
      )}

      {!valid && input && (
        <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>
          格式错误：需为 #RGB 或 #RRGGBB
        </p>
      )}
    </div>
  );
}
