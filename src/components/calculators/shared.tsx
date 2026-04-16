'use client';

import type { ReactNode } from 'react';

/* ── Shared types ── */
interface StagingOption {
  code: string;
  label: string;
  description: string;
}

/* ── StagingGroup ── */
export function StagingGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: StagingOption[];
}) {
  return (
    <div role="radiogroup" aria-label={label}>
      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--fg)' }}>
        {label}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((opt) => {
          const active = value === opt.code;
          return (
            <button
              key={opt.code}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.code)}
              className="rounded-lg p-3 text-left transition-colors"
              style={{
                background: active ? 'rgba(99,102,241,0.12)' : 'var(--card-hover)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>
                  {opt.label}
                </span>
              </div>
              <div className="text-[10px] leading-tight" style={{ color: 'var(--fg-muted)' }}>
                {opt.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── ResultCard ── */
export function ResultCard({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  note,
  color,
  riskLevel,
}: {
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
  note: string;
  color: string;
  riskLevel?: string;
}) {
  return (
    <div
      className="rounded-lg p-4 mt-4"
      style={{ background: 'var(--card-hover)', border: `2px solid ${color}` }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{leftLabel}</div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
            {leftValue}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{rightLabel}</div>
          <div className="text-base font-bold" style={{ color }}>
            {rightValue}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
            {note}
          </div>
        </div>
      </div>
      {riskLevel && (
        <div className="mt-2 text-xs font-medium px-2 py-1 rounded inline-block"
          style={{ background: `${color}1f`, color }}
        >
          {riskLevel}
        </div>
      )}
    </div>
  );
}

/* ── CalculatorNotes ── */
export function CalculatorNotes({
  summary,
  children,
}: {
  summary: string;
  children: ReactNode;
}) {
  return (
    <details className="text-xs" style={{ color: 'var(--fg-muted)' }}>
      <summary className="cursor-pointer hover:underline select-none">{summary}</summary>
      <div className="mt-2 space-y-1.5 pl-3 leading-relaxed">
        {children}
      </div>
    </details>
  );
}

/* ── CalculatorDisclaimer ── */
export function CalculatorDisclaimer() {
  return (
    <div
      className="rounded-lg px-3 py-2 text-[10px] leading-relaxed"
      style={{ background: 'rgba(245,158,11,0.08)', color: 'var(--fg-muted)', border: '1px solid rgba(245,158,11,0.2)' }}
    >
      本计算器仅供学习参考，不能替代病理医师的专业判断。临床决策请以正式病理报告为准。
    </div>
  );
}
