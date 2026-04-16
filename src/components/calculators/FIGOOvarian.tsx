'use client';

import { useState } from 'react';
import { StagingGroup, ResultCard, CalculatorDisclaimer, CalculatorNotes } from './shared';

/**
 * FIGO staging for ovarian carcinoma (2014).
 *
 * M categories now distinguish IVA and IVB:
 * - M1a (IVA): Pleural effusion with positive cytology
 * - M1b (IVB): Parenchymal metastasis or extra-abdominal lymph nodes
 *
 * Reference: FIGO Committee on Gynecologic Oncology. Int J Gynaecol Obstet 2014; 124: 1–5.
 */

interface StagingOption {
  code: string;
  label: string;
  description: string;
}

const T_OPTIONS: StagingOption[] = [
  { code: 'T1', label: 'T1', description: '肿瘤限于卵巢' },
  { code: 'T1a', label: 'T1a', description: '一侧卵巢，无表面种植' },
  { code: 'T1b', label: 'T1b', description: '双侧卵巢，无表面种植' },
  { code: 'T1c', label: 'T1c', description: '一侧或双侧，有表面种植、包膜破裂或腹水细胞学阳性' },
  { code: 'T2', label: 'T2', description: '一侧或双侧卵巢伴盆腔扩散' },
  { code: 'T2a', label: 'T2a', description: '子宫和/或输卵管' },
  { code: 'T2b', label: 'T2b', description: '其他盆腔组织' },
  { code: 'T3', label: 'T3', description: '一侧或双侧卵巢伴腹腔种植超出盆腔' },
  { code: 'T3a', label: 'T3a', description: '腹腔种植<2cm' },
  { code: 'T3b', label: 'T3b', description: '腹腔种植2-5cm' },
  { code: 'T3c', label: 'T3c', description: '腹腔种植>5cm' },
];

const N_OPTIONS: StagingOption[] = [
  { code: 'N0', label: 'N0', description: '无区域淋巴结转移' },
  { code: 'N1', label: 'N1', description: '区域淋巴结转移' },
];

const M_OPTIONS: StagingOption[] = [
  { code: 'M0', label: 'M0', description: '无远处转移' },
  { code: 'M1a', label: 'M1a', description: '胸腔积液伴阳性细胞学 (IVA)' },
  { code: 'M1b', label: 'M1b', description: '实质转移或腹外淋巴结转移 (IVB)' },
];

function calculateFIGO(t: string, n: string, m: string): { stage: string; color: string; note: string; riskLevel: string } {
  if (m === 'M1b') {
    return { stage: 'IVB', color: '#ef4444', note: '实质转移或腹外淋巴结', riskLevel: '极高危' };
  }
  if (m === 'M1a') {
    return { stage: 'IVA', color: '#ef4444', note: '胸腔积液伴阳性细胞学', riskLevel: '极高危' };
  }

  if (t.startsWith('T3') || n === 'N1') {
    if (t === 'T3c' || n === 'N1') {
      return { stage: 'IIIC', color: '#f97316', note: '广泛腹腔种植或淋巴结阳性', riskLevel: '高危' };
    }
    if (t === 'T3b') {
      return { stage: 'IIIB', color: '#f97316', note: '腹腔种植2-5cm', riskLevel: '高危' };
    }
    if (t === 'T3a') {
      return { stage: 'IIIA', color: '#f97316', note: '腹腔种植<2cm', riskLevel: '高危' };
    }
    return { stage: 'III', color: '#f97316', note: '腹腔扩散', riskLevel: '高危' };
  }

  if (t.startsWith('T2')) {
    return { stage: 'II', color: '#f59e0b', note: '盆腔扩散', riskLevel: '中危' };
  }

  if (t.startsWith('T1')) {
    return { stage: 'I', color: '#22c55e', note: '限于卵巢，预后好', riskLevel: '低危' };
  }

  return { stage: 'Unknown', color: '#6b7280', note: '请选择完整分期信息', riskLevel: '' };
}

export function FIGOOvarian() {
  const [t, setT] = useState<string>('T1a');
  const [n, setN] = useState<string>('N0');
  const [m, setM] = useState<string>('M0');
  const result = calculateFIGO(t, n, m);

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>
          FIGO 分期 · 卵巢癌 (2014)
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          基于手术发现的卵巢癌分期系统。选择 T、N、M 类别以计算 FIGO 分期。
        </p>
      </div>

      <StagingGroup label="T · 原发肿瘤" value={t} onChange={setT} options={T_OPTIONS} />
      <StagingGroup label="N · 区域淋巴结" value={n} onChange={setN} options={N_OPTIONS} />
      <StagingGroup label="M · 远处转移" value={m} onChange={setM} options={M_OPTIONS} />

      <ResultCard
        leftLabel="FIGO Stage"
        leftValue={`${t} ${n} ${m}`}
        rightLabel="分期"
        rightValue={`Stage ${result.stage}`}
        note={result.note}
        color={result.color}
        riskLevel={result.riskLevel}
      />

      <CalculatorNotes summary="分期含义与注意事项">
        <p><strong>I 期</strong>：限于卵巢，5 年生存率 &gt;90%</p>
        <p><strong>II 期</strong>：盆腔扩散，5 年生存率 70-80%</p>
        <p><strong>III 期</strong>：腹腔扩散，5 年生存率 30-50%</p>
        <p><strong>IVA</strong>：胸腔积液伴阳性细胞学；<strong>IVB</strong>：实质转移或腹外淋巴结</p>
        <p className="mt-2 opacity-80">* 分期基于手术探索。浆液性癌常为III-IV期。</p>
        <p className="mt-1 opacity-80">* 参考：FIGO Committee on Gynecologic Oncology. <em>Int J Gynaecol Obstet</em> 2014; 124: 1–5.</p>
      </CalculatorNotes>

      <CalculatorDisclaimer />
    </div>
  );
}
