'use client';

import { useState } from 'react';

/**
 * Gleason score → ISUP Grade Group calculator for prostate adenocarcinoma.
 *
 * The Gleason grading system assigns two architectural patterns (primary =
 * most prevalent, secondary = second most prevalent), each scored 1–5.
 * Patterns 1–2 are essentially obsolete in modern practice; the lowest
 * reportable score on biopsy is 3+3 = 6 (Grade Group 1).
 *
 * ISUP 2014 Grade Groups:
 *   GG 1 = 3+3 = 6
 *   GG 2 = 3+4 = 7
 *   GG 3 = 4+3 = 7
 *   GG 4 = 4+4 / 3+5 / 5+3 = 8
 *   GG 5 = 4+5 / 5+4 / 5+5 = 9–10
 *
 * Reference: Epstein JI et al. The 2014 ISUP Gleason Grading Conference.
 * Am J Surg Pathol 2016; 40(2): 244–52.
 */

const PATTERNS = [
  { value: 3, label: 'Pattern 3', description: '分散的小腺体，轮廓完整' },
  { value: 4, label: 'Pattern 4', description: '融合腺体、筛状、肾小球样' },
  { value: 5, label: 'Pattern 5', description: '实性巢/片/单细胞/粉刺样坏死' },
];

function gradeGroup(primary: number, secondary: number): { gg: number; label: string; color: string; note: string } {
  const sum = primary + secondary;
  if (primary === 3 && secondary === 3) {
    return { gg: 1, label: 'Grade Group 1', color: '#22c55e', note: 'Gleason 6 · 低危 · 可考虑主动监测' };
  }
  if (primary === 3 && secondary === 4) {
    return { gg: 2, label: 'Grade Group 2', color: '#84cc16', note: 'Gleason 7 (3+4) · 中低危 · 预后优于 4+3' };
  }
  if (primary === 4 && secondary === 3) {
    return { gg: 3, label: 'Grade Group 3', color: '#f59e0b', note: 'Gleason 7 (4+3) · 中高危 · 需积极治疗' };
  }
  if (sum === 8) {
    return { gg: 4, label: 'Grade Group 4', color: '#f97316', note: `Gleason ${sum} (${primary}+${secondary}) · 高危` };
  }
  return { gg: 5, label: 'Grade Group 5', color: '#ef4444', note: `Gleason ${sum} (${primary}+${secondary}) · 极高危` };
}

export function GleasonGradeGroup() {
  const [primary, setPrimary] = useState(3);
  const [secondary, setSecondary] = useState(3);
  const result = gradeGroup(primary, secondary);
  const sum = primary + secondary;

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>
          Gleason Score / ISUP Grade Group · 前列腺癌分级
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          选择主要模式（Primary pattern, 面积最大）和次要模式（Secondary pattern），系统自动计算 Gleason 评分和 ISUP 分级组。
        </p>
      </div>

      <PatternSelector label="主要模式 · Primary pattern" value={primary} onChange={setPrimary} />
      <PatternSelector label="次要模式 · Secondary pattern" value={secondary} onChange={setSecondary} />

      <div className="rounded-lg p-4" style={{ background: 'var(--card-hover)', border: `2px solid ${result.color}` }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>Gleason Score</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
              {primary} + {secondary} = {sum}
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
        <summary className="cursor-pointer hover:underline select-none">ISUP Grade Group 对应关系与注意事项</summary>
        <div className="mt-2 space-y-1.5 pl-3 leading-relaxed">
          <p><strong>GG 1</strong> = 3+3 = 6 → 低危（主动监测候选）</p>
          <p><strong>GG 2</strong> = 3+4 = 7 → 中低危（4 成分 &lt; 主模式）</p>
          <p><strong>GG 3</strong> = 4+3 = 7 → 中高危（4 成分 &gt; 3 成分，生化复发更高）</p>
          <p><strong>GG 4</strong> = 4+4 / 3+5 / 5+3 = 8 → 高危</p>
          <p><strong>GG 5</strong> = 4+5 / 5+4 / 5+5 = 9–10 → 极高危</p>
          <p className="mt-2 opacity-80">
            * Pattern 1 和 2 在现代实践中已不再用于活检报告。最低可报告 Gleason 分为 3+3=6。
          </p>
          <p className="opacity-80">
            * 穿刺活检中如出现 &gt;2 种模式（tertiary pattern），按 ISUP 2019 建议：
            主要 + 最高级别模式报告，同时注释 tertiary pattern。
          </p>
          <p className="mt-1 opacity-80">
            * 参考：Epstein JI et al. <em>Am J Surg Pathol</em> 2016; 40(2): 244–52.
          </p>
        </div>
      </details>
    </div>
  );
}

function PatternSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--fg)' }}>{label}</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {PATTERNS.map((p) => {
          const active = value === p.value;
          return (
            <button
              key={p.value}
              onClick={() => onChange(p.value)}
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
                  {p.value}
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>
                  {p.label}
                </span>
              </div>
              <div className="text-[10px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
                {p.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
