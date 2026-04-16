'use client';

import { useState } from 'react';
import { StagingGroup, CalculatorDisclaimer, CalculatorNotes } from './shared';

/**
 * TNM Staging System (8th Edition) - Generic framework for cancer staging.
 */

interface TNMOption {
  code: string;
  label: string;
  description: string;
}

const T_OPTIONS: TNMOption[] = [
  { code: 'Tis', label: 'Tis', description: '原位癌' },
  { code: 'T0', label: 'T0', description: '无原发肿瘤证据' },
  { code: 'T1', label: 'T1', description: '肿瘤限于原发部位，小' },
  { code: 'T2', label: 'T2', description: '肿瘤限于原发部位，中等' },
  { code: 'T3', label: 'T3', description: '肿瘤限于原发部位，大或局部侵犯' },
  { code: 'T4', label: 'T4', description: '肿瘤广泛侵犯邻近结构' },
];

const N_OPTIONS: TNMOption[] = [
  { code: 'N0', label: 'N0', description: '无区域淋巴结转移' },
  { code: 'N1', label: 'N1', description: '区域淋巴结转移，少量' },
  { code: 'N2', label: 'N2', description: '区域淋巴结转移，中等' },
  { code: 'N3', label: 'N3', description: '区域淋巴结转移，广泛' },
];

const M_OPTIONS: TNMOption[] = [
  { code: 'M0', label: 'M0', description: '无远处转移' },
  { code: 'M1', label: 'M1', description: '远处转移' },
  { code: 'M1a', label: 'M1a', description: '远处淋巴结转移' },
  { code: 'M1b', label: 'M1b', description: '远处器官转移' },
  { code: 'M1c', label: 'M1c', description: '远处淋巴结和器官转移' },
];

export function TNMStaging() {
  const [t, setT] = useState<string>('T1');
  const [n, setN] = useState<string>('N0');
  const [m, setM] = useState<string>('M0');

  const tnmString = `${t}${n}${m}`;

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>
          TNM 分期 · 第 8 版通用框架
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          肿瘤-淋巴结-转移分期系统。选择 T、N、M 类别以生成 TNM 描述。实际分期规则因癌症类型而异。
        </p>
      </div>

      <StagingGroup label="T · 原发肿瘤" value={t} onChange={setT} options={T_OPTIONS} />
      <StagingGroup label="N · 区域淋巴结" value={n} onChange={setN} options={N_OPTIONS} />
      <StagingGroup label="M · 远处转移" value={m} onChange={setM} options={M_OPTIONS} />

      <div
        className="rounded-lg p-4 mt-4"
        style={{ background: 'var(--card-hover)', border: `2px solid var(--accent)` }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>TNM 分期</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
              {tnmString}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>描述</div>
            <div className="text-base font-bold" style={{ color: 'var(--fg)' }}>
              {T_OPTIONS.find(opt => opt.code === t)?.label ?? t} {N_OPTIONS.find(opt => opt.code === n)?.label ?? n} {M_OPTIONS.find(opt => opt.code === m)?.label ?? m}
            </div>
          </div>
        </div>
      </div>

      <CalculatorNotes summary="TNM 系统说明">
        <p><strong>T (Tumor)</strong>：描述原发肿瘤的大小和局部侵犯程度</p>
        <p><strong>N (Node)</strong>：描述区域淋巴结转移的情况</p>
        <p><strong>M (Metastasis)</strong>：描述远处转移的存在</p>
        <p className="mt-2 opacity-80">* TNM 是描述性系统，实际的临床分期(Stage I-IV)需要结合具体癌症的规则。</p>
        <p className="mt-1 opacity-80">* 参考：AJCC Cancer Staging Manual, 8th Edition.</p>
      </CalculatorNotes>

      <CalculatorDisclaimer />
    </div>
  );
}
