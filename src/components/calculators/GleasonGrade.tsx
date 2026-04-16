'use client';

import { useState } from 'react';

/**
 * Gleason grading system for prostate adenocarcinoma (ISUP 2014).
 * Two patterns: primary (most prevalent) and secondary (next most).
 * Gleason score = primary + secondary (2–10).
 * Mapped to ISUP Grade Groups 1–5.
 *
 * - Pattern 1: Well-formed glands, closely packed
 * - Pattern 2: Well-formed glands, more loosely arranged
 * - Pattern 3: Irregular glands, variable size/shape
 * - Pattern 4: Poorly formed glands, cribriform, fused
 * - Pattern 5: Solid sheets, single cells, comedonecrosis
 *
 * Reference: Epstein JI et al. Am J Surg Pathol 2016; 40: 244–52.
 */

interface PatternOption {
  pattern: 1 | 2 | 3 | 4 | 5;
  label: string;
  description: string;
}

const PATTERN_OPTIONS: PatternOption[] = [
  { pattern: 1, label: 'Pattern 1', description: '紧密排列的圆形腺体，边界清楚' },
  { pattern: 2, label: 'Pattern 2', description: '松散排列的圆形腺体，仍较规则' },
  { pattern: 3, label: 'Pattern 3', description: '不规则腺体，大小形状变异' },
  { pattern: 4, label: 'Pattern 4', description: '腺体融合、筛孔状、形成不良' },
  { pattern: 5, label: 'Pattern 5', description: '实性片状、单细胞、坏死' },
];

function gradeGroupFromScore(primary: number, secondary: number): { group: 1 | 2 | 3 | 4 | 5; label: string; color: string; note: string } {
  const score = primary + secondary;
  if (score <= 6) {
    return {
      group: 1,
      label: 'Grade Group 1 · Gleason score 6 (3+3)',
      color: '#22c55e',
      note: '低危 · 预后极好，可考虑主动监测',
    };
  }
  if (score === 7 && primary === 3) {
    return {
      group: 2,
      label: 'Grade Group 2 · Gleason score 7 (3+4)',
      color: '#84cc16',
      note: '低-中危 · 仍属有利预后',
    };
  }
  if (score === 7 && primary === 4) {
    return {
      group: 3,
      label: 'Grade Group 3 · Gleason score 7 (4+3)',
      color: '#f59e0b',
      note: '中危 · 预后介于 GG2 和 GG4 之间',
    };
  }
  if (score === 8) {
    return {
      group: 4,
      label: 'Grade Group 4 · Gleason score 8 (4+4)',
      color: '#f97316',
      note: '高危 · 显著增加复发和转移风险',
    };
  }
  return {
    group: 5,
    label: 'Grade Group 5 · Gleason score 9–10',
    color: '#ef4444',
    note: '最高危 · 预后差，常需积极治疗',
  };
}

export function GleasonGrade() {
  const [primary, setPrimary] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [secondary, setSecondary] = useState<1 | 2 | 3 | 4 | 5>(3);
  const score = primary + secondary;
  const result = gradeGroupFromScore(primary, secondary);

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>
          Gleason 分级 · ISUP 2014 修订版
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          前列腺腺癌的标准分级系统。主要模式（最常见）+ 次要模式（次常见）= Gleason score，映射到 Grade Group 1–5。
        </p>
      </div>

      <PatternGroup
        label="主要 Gleason 模式 · Primary pattern"
        value={primary}
        onChange={(v) => setPrimary(v)}
        options={PATTERN_OPTIONS}
      />
      <PatternGroup
        label="次要 Gleason 模式 · Secondary pattern"
        value={secondary}
        onChange={(v) => setSecondary(v)}
        options={PATTERN_OPTIONS}
      />

      <div
        className="rounded-lg p-4 mt-4"
        style={{ background: 'var(--card-hover)', border: `2px solid ${result.color}` }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>Gleason Score</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
              {primary} + {secondary} = {score}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>ISUP Grade Group</div>
            <div className="text-base font-bold" style={{ color: result.color }}>
              {result.label}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
              {result.note}
            </div>
          </div>
        </div>
      </div>

      <details className="text-xs" style={{ color: 'var(--fg-muted)' }}>
        <summary className="cursor-pointer hover:underline select-none">分级含义与注意事项</summary>
        <div className="mt-2 space-y-1.5 pl-3 leading-relaxed">
          <p>
            <strong>GG1 (≤6)</strong>：低危，5 年 BCR 率 &lt;10%
          </p>
          <p>
            <strong>GG2 (3+4=7)</strong>：低-中危，5 年 BCR 率 10–20%
          </p>
          <p>
            <strong>GG3 (4+3=7)</strong>：中危，5 年 BCR 率 20–30%
          </p>
          <p>
            <strong>GG4 (8)</strong>：高危，5 年 BCR 率 30–40%
          </p>
          <p>
            <strong>GG5 (9–10)</strong>：最高危，5 年 BCR 率 &gt;40%
          </p>
          <p className="mt-2 opacity-80">
            * 报告时注明主要/次要模式顺序。Tertiary pattern (≥5%) 可额外报告。
          </p>
          <p className="mt-1 opacity-80">
            * 参考：Epstein JI et al. <em>Am J Surg Pathol</em> 2016; 40: 244–52.
          </p>
        </div>
      </details>
    </div>
  );
}

function PatternGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
  options: PatternOption[];
}) {
  return (
    <div>
      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--fg)' }}>
        {label}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {options.map((opt) => {
          const active = value === opt.pattern;
          return (
            <button
              key={opt.pattern}
              onClick={() => onChange(opt.pattern)}
              className="rounded-lg p-3 text-left transition-colors"
              style={{
                background: active ? 'rgba(99,102,241,0.12)' : 'var(--card-hover)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: active ? 'var(--accent)' : 'var(--card)',
                    color: active ? '#fff' : 'var(--fg-muted)',
                  }}
                >
                  {opt.pattern}
                </span>
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