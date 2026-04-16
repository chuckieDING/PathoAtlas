'use client';

import { useState } from 'react';

/**
 * ISUP/WHO nuclear grading for clear cell renal cell carcinoma (2013).
 * Four grades based on nuclear size, irregularity, and nucleolar prominence.
 *
 * - Grade 1: Nuclei round, uniform, similar to normal tubular cells
 * - Grade 2: Nuclei slightly irregular, enlarged, nucleoli inconspicuous
 * - Grade 3: Nuclei obviously irregular, enlarged, nucleoli prominent
 * - Grade 4: Nuclei bizarre, multilobated, macronucleoli, sarcomatoid
 *
 * Reference: Delahunt B et al. Am J Surg Pathol 2013; 37: 1469–74.
 */

interface GradeOption {
  grade: 1 | 2 | 3 | 4;
  label: string;
  description: string;
}

const GRADE_OPTIONS: GradeOption[] = [
  { grade: 1, label: 'Grade 1', description: '核圆形均匀，与正常肾小管上皮相似' },
  { grade: 2, label: 'Grade 2', description: '核轻度增大、不规则，核仁不明显' },
  { grade: 3, label: 'Grade 3', description: '核明显增大、不规则，核仁突出' },
  { grade: 4, label: 'Grade 4', description: '核极度异型、多叶状、大核仁、肉瘤样' },
];

function gradeInfo(grade: 1 | 2 | 3 | 4): { label: string; color: string; note: string } {
  switch (grade) {
    case 1:
      return {
        label: 'Grade 1 · 低级别',
        color: '#22c55e',
        note: '预后极好，5年生存率 >95%',
      };
    case 2:
      return {
        label: 'Grade 2 · 中低级别',
        color: '#84cc16',
        note: '预后良好，5年生存率 85-95%',
      };
    case 3:
      return {
        label: 'Grade 3 · 中高级别',
        color: '#f59e0b',
        note: '预后中等，5年生存率 70-85%',
      };
    case 4:
      return {
        label: 'Grade 4 · 高级别',
        color: '#ef4444',
        note: '预后差，5年生存率 <70%，常伴肉瘤样变',
      };
  }
}

export function ISUPGrade() {
  const [grade, setGrade] = useState<1 | 2 | 3 | 4>(2);
  const result = gradeInfo(grade);

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>
          ISUP/WHO 核分级 · Clear Cell RCC
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          透明细胞肾细胞癌的标准核分级系统，基于核大小、不规则度和核仁突出度分为 1–4 级。
        </p>
      </div>

      <GradeGroup
        value={grade}
        onChange={(v) => setGrade(v)}
        options={GRADE_OPTIONS}
      />

      <div
        className="rounded-lg p-4 mt-4"
        style={{ background: 'var(--card-hover)', border: `2px solid ${result.color}` }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>ISUP Grade</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
              {grade}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>分级</div>
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
            <strong>G1</strong>：核与正常肾小管相似，预后极好
          </p>
          <p>
            <strong>G2</strong>：核轻度增大，异型轻微，中低危
          </p>
          <p>
            <strong>G3</strong>：核明显增大，核仁突出，中高危
          </p>
          <p>
            <strong>G4</strong>：核极度异型，常伴肉瘤样变，高危
          </p>
          <p className="mt-2 opacity-80">
            * 肉瘤样变自动为 G4，无论核形态如何。
          </p>
          <p className="mt-1 opacity-80">
            * 参考：Delahunt B et al. <em>Am J Surg Pathol</em> 2013; 37: 1469–74.
          </p>
        </div>
      </details>
    </div>
  );
}

function GradeGroup({
  value,
  onChange,
  options,
}: {
  value: 1 | 2 | 3 | 4;
  onChange: (v: 1 | 2 | 3 | 4) => void;
  options: GradeOption[];
}) {
  return (
    <div>
      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--fg)' }}>
        选择核分级
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        {options.map((opt) => {
          const active = value === opt.grade;
          return (
            <button
              key={opt.grade}
              onClick={() => onChange(opt.grade)}
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
                  {opt.grade}
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