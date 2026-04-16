'use client';

import { useState } from 'react';
import { StagingGroup, ResultCard, CalculatorDisclaimer, CalculatorNotes } from './shared';

/**
 * FIGO staging for cervical cancer (2018 revision).
 *
 * N categories now distinguish pelvic vs. para-aortic nodes:
 * - N0: No regional lymph node metastasis
 * - N1: Pelvic lymph node metastasis only → IIIC1
 * - N2: Para-aortic lymph node metastasis → IIIC2
 *
 * Reference: FIGO Committee on Gynecologic Oncology. Int J Gynaecol Obstet 2019; 145: 129–35.
 */

interface StagingOption {
  code: string;
  label: string;
  description: string;
}

const T_OPTIONS: StagingOption[] = [
  { code: 'T1a', label: 'T1a', description: '显微镜下浸润，深度≤5mm，宽度≤7mm' },
  { code: 'T1a1', label: 'T1a1', description: '深度≤3mm，宽度≤7mm' },
  { code: 'T1a2', label: 'T1a2', description: '深度3-5mm，宽度≤7mm' },
  { code: 'T1b', label: 'T1b', description: '临床可见浸润或T1a但深度>5mm或宽度>7mm' },
  { code: 'T1b1', label: 'T1b1', description: '≤2cm' },
  { code: 'T1b2', label: 'T1b2', description: '2-4cm' },
  { code: 'T1b3', label: 'T1b3', description: '>4cm' },
  { code: 'T2', label: 'T2', description: '超出宫颈但未达盆壁或下1/3阴道' },
  { code: 'T2a', label: 'T2a', description: '无明显子宫旁浸润' },
  { code: 'T2a1', label: 'T2a1', description: '≤4cm' },
  { code: 'T2a2', label: 'T2a2', description: '>4cm' },
  { code: 'T2b', label: 'T2b', description: '有子宫旁浸润' },
  { code: 'T3', label: 'T3', description: '达盆壁或下1/3阴道' },
  { code: 'T3a', label: 'T3a', description: '下1/3阴道，无盆壁浸润' },
  { code: 'T3b', label: 'T3b', description: '达盆壁或水肿导致肾功能不全' },
  { code: 'T4', label: 'T4', description: '侵犯膀胱/直肠黏膜或超出真骨盆' },
];

const N_OPTIONS: StagingOption[] = [
  { code: 'N0', label: 'N0', description: '无区域淋巴结转移' },
  { code: 'N1', label: 'N1', description: '盆腔淋巴结转移' },
  { code: 'N2', label: 'N2', description: '腹主动脉旁淋巴结转移' },
];

const M_OPTIONS: StagingOption[] = [
  { code: 'M0', label: 'M0', description: '无远处转移' },
  { code: 'M1', label: 'M1', description: '远处转移' },
];

function calculateFIGO(t: string, n: string, m: string): { stage: string; color: string; note: string; riskLevel: string } {
  if (m === 'M1') {
    return { stage: 'IVB', color: '#ef4444', note: '远处转移，预后差', riskLevel: '极高危' };
  }

  if (n === 'N2') {
    return { stage: 'IIIC2', color: '#f97316', note: '腹主动脉旁淋巴结阳性', riskLevel: '高危' };
  }

  if (n === 'N1') {
    return { stage: 'IIIC1', color: '#f97316', note: '盆腔淋巴结阳性', riskLevel: '高危' };
  }

  if (t === 'T4') {
    return { stage: 'IVA', color: '#ef4444', note: '邻近器官浸润', riskLevel: '极高危' };
  }

  if (t === 'T3b') {
    return { stage: 'IIIB', color: '#f97316', note: '达盆壁或肾积水', riskLevel: '高危' };
  }
  if (t === 'T3a') {
    return { stage: 'IIIA', color: '#f97316', note: '下1/3阴道受累', riskLevel: '高危' };
  }
  if (t === 'T3') {
    return { stage: 'III', color: '#f97316', note: '局部晚期', riskLevel: '高危' };
  }

  if (t.startsWith('T2')) {
    return { stage: 'II', color: '#f59e0b', note: '超出宫颈', riskLevel: '中危' };
  }

  if (t.startsWith('T1')) {
    return { stage: 'I', color: '#22c55e', note: '限于宫颈，预后好', riskLevel: '低危' };
  }

  return { stage: 'Unknown', color: '#6b7280', note: '请选择完整分期信息', riskLevel: '' };
}

export function FIGOCervical() {
  const [t, setT] = useState<string>('T1b1');
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
          FIGO 分期 · 宫颈癌 (2018 修订版)
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          基于临床和病理检查的宫颈癌分期系统。选择 T、N、M 类别以计算 FIGO 分期。
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
        <p><strong>I 期</strong>：限于宫颈，5 年生存率 &gt;90%</p>
        <p><strong>II 期</strong>：超出宫颈但未达盆壁，5 年生存率 65-80%</p>
        <p><strong>III 期</strong>：达盆壁或淋巴结阳性，5 年生存率 35-50%</p>
        <p><strong>IIIC1</strong>：盆腔淋巴结转移；<strong>IIIC2</strong>：腹主动脉旁淋巴结转移</p>
        <p><strong>IV 期</strong>：远处转移或邻近器官，5 年生存率 &lt;20%</p>
        <p className="mt-2 opacity-80">* 分期基于临床检查、影像学和病理。手术后可重新分期。</p>
        <p className="mt-1 opacity-80">* 参考：FIGO Committee on Gynecologic Oncology. <em>Int J Gynaecol Obstet</em> 2019; 145: 129–35.</p>
      </CalculatorNotes>

      <CalculatorDisclaimer />
    </div>
  );
}
