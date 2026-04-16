'use client';

import { useState } from 'react';

/**
 * ISUP/WHO Nucleolar Grading for clear cell and papillary renal cell
 * carcinoma (replaces the legacy Fuhrman system).
 *
 * Grade 1: Absent / inconspicuous nucleoli at 400×
 * Grade 2: Conspicuous and eosinophilic nucleoli at 400× but inconspicuous at 100×
 * Grade 3: Conspicuous and eosinophilic nucleoli at 100×
 * Grade 4: Extreme nuclear pleomorphism, rhabdoid/sarcomatoid features, or tumor giant cells
 *
 * Reference: Delahunt B et al. The ISUP Grading System for Renal Cell
 * Carcinoma. Am J Surg Pathol 2013; 37: 1490–504.
 */

interface GradeOption {
  grade: 1 | 2 | 3 | 4;
  label: string;
  description: string;
  color: string;
  prognosis: string;
}

const GRADES: GradeOption[] = [
  {
    grade: 1,
    label: 'Grade 1',
    description: '400× 下核仁缺如或不明显',
    color: '#22c55e',
    prognosis: '低级别 · 预后好 · 5 年 CSS > 90%',
  },
  {
    grade: 2,
    label: 'Grade 2',
    description: '400× 下可见嗜酸核仁，但 100× 不明显',
    color: '#84cc16',
    prognosis: '低级别 · 预后较好',
  },
  {
    grade: 3,
    label: 'Grade 3',
    description: '100× 低倍就可见明显嗜酸核仁',
    color: '#f59e0b',
    prognosis: '高级别 · 需关注侵袭性',
  },
  {
    grade: 4,
    label: 'Grade 4',
    description: '显著核多形性、横纹肌样/肉瘤样特征、或瘤巨细胞',
    color: '#ef4444',
    prognosis: '高级别 · 预后差 · 含肉瘤样成分者最差',
  },
];

export function ISUPRenalGrade() {
  const [selected, setSelected] = useState<GradeOption>(GRADES[0]);

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>
          ISUP/WHO 核仁分级 · 肾细胞癌
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          适用于透明细胞 RCC 和乳头状 RCC。基于核仁在不同放大倍数下的可见度分为 4 级（取代旧的 Fuhrman 分级）。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {GRADES.map((g) => {
          const active = selected.grade === g.grade;
          return (
            <button
              key={g.grade}
              onClick={() => setSelected(g)}
              className="rounded-lg p-4 text-left transition-colors"
              style={{
                background: active ? 'rgba(99,102,241,0.12)' : 'var(--card-hover)',
                border: `2px solid ${active ? g.color : 'var(--border)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: active ? g.color : 'var(--card)',
                    color: active ? '#fff' : 'var(--fg-muted)',
                  }}
                >
                  {g.grade}
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{g.label}</span>
              </div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{g.description}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg p-4" style={{ background: 'var(--card-hover)', border: `2px solid ${selected.color}` }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>当前选择</div>
            <div className="text-xl font-bold" style={{ color: selected.color }}>{selected.label}</div>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>预后提示</div>
            <div className="text-sm" style={{ color: 'var(--fg)' }}>{selected.prognosis}</div>
          </div>
        </div>
      </div>

      <details className="text-xs" style={{ color: 'var(--fg-muted)' }}>
        <summary className="cursor-pointer hover:underline select-none">适用范围与注意事项</summary>
        <div className="mt-2 space-y-1.5 pl-3 leading-relaxed">
          <p><strong>适用</strong>：透明细胞 RCC、乳头状 RCC（I 型和 II 型）</p>
          <p><strong>不适用</strong>：嫌色细胞 RCC（核仁不是主要预后因素）、MiT 家族易位型、集合管癌</p>
          <p>* Grade 4 需至少包含以下之一：显著核多形性（有丝分裂常活跃）、横纹肌样分化、肉瘤样分化、瘤巨细胞。</p>
          <p>* 参考：Delahunt B et al. <em>Am J Surg Pathol</em> 2013; 37: 1490–504.</p>
        </div>
      </details>
    </div>
  );
}
