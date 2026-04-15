'use client';

import { useState } from 'react';

/**
 * Nottingham histologic grade (Elston-Ellis modification, 1991) — the
 * standard grading system for invasive breast carcinoma. Three parameters
 * each scored 1–3, summed to a total of 3–9, mapped to G1/G2/G3.
 *
 * - 腺管形成 Tubule formation: >75% = 1, 10–75% = 2, <10% = 3
 * - 核多形性 Nuclear pleomorphism: small regular = 1, moderate = 2, marked = 3
 * - 核分裂 Mitotic count: reported per 10 HPF (field area-dependent).
 *   Classic cutoffs for a 0.274 mm² field (≈ 40× Leica FN20 objective):
 *     ≤9 mitoses = 1, 10–19 = 2, ≥20 = 3.
 *   For the more common 0.196 mm² field:
 *     ≤7 = 1, 8–14 = 2, ≥15 = 3.
 *
 * Reference: Elston CW, Ellis IO. Pathological prognostic factors in
 * breast cancer I. Histopathology 1991; 19: 403–10.
 */

interface ScoreOption {
  score: 1 | 2 | 3;
  label: string;
  description: string;
}

const TUBULE_OPTIONS: ScoreOption[] = [
  { score: 1, label: '>75% 形成腺管', description: '大部分肿瘤呈明显腺管/腺样结构' },
  { score: 2, label: '10–75% 形成腺管', description: '中等比例腺管成分' },
  { score: 3, label: '<10% 形成腺管', description: '实性为主，腺管极少' },
];

const PLEOMORPHISM_OPTIONS: ScoreOption[] = [
  { score: 1, label: '轻度', description: '核大小与正常导管上皮接近，规则一致' },
  { score: 2, label: '中度', description: '细胞较大，核变化明显，核仁易见' },
  { score: 3, label: '重度', description: '核大小明显差异，多形性显著，核仁突出' },
];

const MITOSIS_OPTIONS: ScoreOption[] = [
  { score: 1, label: '低 (≤7/10 HPF)', description: '0.196 mm² 每 HPF；较少核分裂' },
  { score: 2, label: '中 (8–14/10 HPF)', description: '中等核分裂活性' },
  { score: 3, label: '高 (≥15/10 HPF)', description: '核分裂活跃' },
];

function gradeFromSum(sum: number): { grade: 1 | 2 | 3; label: string; color: string; note: string } {
  if (sum <= 5) {
    return {
      grade: 1,
      label: 'Grade 1 · 低级别 (Well differentiated)',
      color: '#22c55e',
      note: '分化好 · 5 年 OS ≈ 90%+',
    };
  }
  if (sum <= 7) {
    return {
      grade: 2,
      label: 'Grade 2 · 中级别 (Moderately differentiated)',
      color: '#f59e0b',
      note: '中度分化 · 预后介于 G1 和 G3 之间',
    };
  }
  return {
    grade: 3,
    label: 'Grade 3 · 高级别 (Poorly differentiated)',
    color: '#ef4444',
    note: '低分化 · 预后相对差，常需系统治疗',
  };
}

export function NottinghamGrade() {
  const [tubule, setTubule] = useState<1 | 2 | 3>(2);
  const [pleomorphism, setPleomorphism] = useState<1 | 2 | 3>(2);
  const [mitosis, setMitosis] = useState<1 | 2 | 3>(2);
  const sum = tubule + pleomorphism + mitosis;
  const result = gradeFromSum(sum);

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>
          Nottingham 组织学分级 · Elston-Ellis 修订版
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          适用于乳腺浸润性导管癌 NST 及多数浸润癌亚型。三项各评 1–3 分，合计 3–9 分，决定 G1/G2/G3。
        </p>
      </div>

      <ScoreGroup
        label="腺管形成 · Tubule formation"
        value={tubule}
        onChange={(v) => setTubule(v)}
        options={TUBULE_OPTIONS}
      />
      <ScoreGroup
        label="核多形性 · Nuclear pleomorphism"
        value={pleomorphism}
        onChange={(v) => setPleomorphism(v)}
        options={PLEOMORPHISM_OPTIONS}
      />
      <ScoreGroup
        label="核分裂 · Mitotic count"
        value={mitosis}
        onChange={(v) => setMitosis(v)}
        options={MITOSIS_OPTIONS}
      />

      <div
        className="rounded-lg p-4 mt-4"
        style={{ background: 'var(--card-hover)', border: `2px solid ${result.color}` }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>总分 · Total</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
              {tubule} + {pleomorphism} + {mitosis} = {sum}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>Nottingham Grade</div>
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
            <strong>G1 (3–5 分)</strong>：高分化，预后好
          </p>
          <p>
            <strong>G2 (6–7 分)</strong>：中度分化
          </p>
          <p>
            <strong>G3 (8–9 分)</strong>：低/未分化，预后差
          </p>
          <p className="mt-2 opacity-80">
            * 核分裂 cutoff 依赖显微镜 HPF 面积。上述基于 0.196 mm² 每 HPF（常见 40× Olympus）。
            对 0.274 mm² 每 HPF（40× Leica FN22）用 ≤9/10–19/≥20 三档。使用前请按所用物镜的 mm² 换算。
          </p>
          <p className="mt-1 opacity-80">
            * 参考：Elston CW, Ellis IO. <em>Histopathology</em> 1991; 19: 403–10.
          </p>
        </div>
      </details>
    </div>
  );
}

function ScoreGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: 1 | 2 | 3;
  onChange: (v: 1 | 2 | 3) => void;
  options: ScoreOption[];
}) {
  return (
    <div>
      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--fg)' }}>
        {label}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.map((opt) => {
          const active = value === opt.score;
          return (
            <button
              key={opt.score}
              onClick={() => onChange(opt.score)}
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
                  {opt.score}
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>
                  {opt.label}
                </span>
              </div>
              <div className="text-[10px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
                {opt.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
