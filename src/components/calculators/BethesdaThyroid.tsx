'use client';

import { useState } from 'react';
import { CalculatorDisclaimer, CalculatorNotes } from './shared';

/**
 * Bethesda System for Reporting Thyroid Cytopathology (2023, 3rd Edition).
 * Six diagnostic categories with associated malignancy risk.
 *
 * Reference: Ali SZ, Baloch ZW, Cochand-Priollet B, et al. The 2023 Bethesda System
 * for Reporting Thyroid Cytopathology. Thyroid 2023; 33: 1039–44.
 */

interface CategoryOption {
  category: 1 | 2 | 3 | 4 | 5 | 6;
  roman: string;
  label: string;
  description: string;
  malignancyRisk: string;
  recommendation: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    category: 1,
    roman: 'I',
    label: 'Nondiagnostic or Unsatisfactory',
    description: '不满意或非诊断性标本',
    malignancyRisk: '5-10%',
    recommendation: '重复穿刺',
  },
  {
    category: 2,
    roman: 'II',
    label: 'Benign',
    description: '良性',
    malignancyRisk: '0-3%',
    recommendation: '临床随访',
  },
  {
    category: 3,
    roman: 'III',
    label: 'Atypia of Undetermined Significance',
    description: '非典型未定意义',
    malignancyRisk: '~10-30%',
    recommendation: '重复穿刺、分子检测或诊断性手术切除',
  },
  {
    category: 4,
    roman: 'IV',
    label: 'Follicular Neoplasm',
    description: '滤泡性肿瘤',
    malignancyRisk: '25-40%',
    recommendation: '手术切除',
  },
  {
    category: 5,
    roman: 'V',
    label: 'Suspicious for Malignancy',
    description: '可疑恶性',
    malignancyRisk: '50-75%',
    recommendation: '手术切除',
  },
  {
    category: 6,
    roman: 'VI',
    label: 'Malignant',
    description: '恶性',
    malignancyRisk: '97-99%',
    recommendation: '手术切除',
  },
];

function getCategoryInfo(category: 1 | 2 | 3 | 4 | 5 | 6): CategoryOption {
  return CATEGORY_OPTIONS.find(opt => opt.category === category)!;
}

export function BethesdaThyroid() {
  const [category, setCategory] = useState<1 | 2 | 3 | 4 | 5 | 6>(2);
  const result = getCategoryInfo(category);

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>
          Bethesda 分级 · 甲状腺 FNA (2023 第3版)
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          甲状腺细针穿刺细胞学报告的标准化系统。选择诊断类别以查看恶性风险和临床建议。
        </p>
      </div>

      <CategoryGroup
        value={category}
        onChange={setCategory}
        options={CATEGORY_OPTIONS}
      />

      <div
        className="rounded-lg p-4 mt-4"
        style={{ background: 'var(--card-hover)', border: `2px solid ${category >= 5 ? '#ef4444' : category >= 4 ? '#f97316' : category >= 3 ? '#f59e0b' : '#22c55e'}` }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>Bethesda Category</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
              {result.roman}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>诊断</div>
            <div className="text-base font-bold" style={{ color: 'var(--fg)' }}>
              {result.label}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
              恶性风险: {result.malignancyRisk}
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs font-medium px-2 py-1 rounded inline-block"
          style={{
            background: category >= 5 ? 'rgba(239,68,68,0.12)' : category >= 4 ? 'rgba(249,115,22,0.12)' : category >= 3 ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
            color: category >= 5 ? '#ef4444' : category >= 4 ? '#f97316' : category >= 3 ? '#f59e0b' : '#22c55e',
          }}
        >
          {category >= 5 ? '高危' : category >= 4 ? '中-高危' : category >= 3 ? '中危' : '低危'}
        </div>
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--fg)' }}>临床建议</div>
          <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            {result.recommendation}
          </div>
        </div>
      </div>

      <CalculatorNotes summary="分级含义与注意事项">
        <p><strong>I (不满意)</strong>：标本质量不佳，需重复穿刺</p>
        <p><strong>II (良性)</strong>：结节性甲状腺肿或慢性淋巴细胞性甲状腺炎</p>
        <p><strong>III (非典型)</strong>：细胞异型但不足以诊断恶性，需进一步评估</p>
        <p><strong>IV (滤泡肿瘤)</strong>：滤泡性腺瘤 vs 癌，需手术鉴别</p>
        <p><strong>V (可疑恶性)</strong>：高度提示恶性，建议手术</p>
        <p><strong>VI (恶性)</strong>：明确恶性，需手术治疗</p>
        <p className="mt-2 opacity-80">* 恶性风险基于大样本研究，可能因地区和实验室而异。</p>
        <p className="mt-1 opacity-80">* 参考：Ali SZ et al. <em>Thyroid</em> 2023; 33: 1039–44 (第3版).</p>
      </CalculatorNotes>

      <CalculatorDisclaimer />
    </div>
  );
}

function CategoryGroup({
  value,
  onChange,
  options,
}: {
  value: 1 | 2 | 3 | 4 | 5 | 6;
  onChange: (v: 1 | 2 | 3 | 4 | 5 | 6) => void;
  options: CategoryOption[];
}) {
  return (
    <div role="radiogroup" aria-label="选择诊断类别">
      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--fg)' }}>
        选择诊断类别
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((opt) => {
          const active = value === opt.category;
          return (
            <button
              key={opt.category}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.category)}
              className="rounded-lg p-3 text-left transition-colors"
              style={{
                background: active ? 'rgba(99,102,241,0.12)' : 'var(--card-hover)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: active ? 'var(--accent)' : 'var(--card)',
                    color: active ? '#fff' : 'var(--fg-muted)',
                  }}
                >
                  {opt.roman}
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
