'use client';

import { useState } from 'react';
import { StagingGroup, ResultCard, CalculatorDisclaimer, CalculatorNotes } from './shared';

/**
 * FIGO staging for endometrial carcinoma (2009).
 * Note: FIGO published a revised staging system in 2023 (Int J Gynaecol Obstet 2023; 162: 679–693)
 * that introduces molecular subtypes. This calculator reflects the 2009 system.
 *
 * Reference: FIGO Committee on Gynecologic Oncology. Int J Gynaecol Obstet 2009; 105: 3–4.
 */

interface StagingOption {
  code: string;
  label: string;
  description: string;
}

const T_OPTIONS: StagingOption[] = [
  { code: 'T1', label: 'T1', description: '肿瘤限于子宫体' },
  { code: 'T1a', label: 'T1a', description: '无肌层浸润或<50%肌层浸润' },
  { code: 'T1b', label: 'T1b', description: '≥50%肌层浸润' },
  { code: 'T2', label: 'T2', description: '侵犯宫颈间质' },
  { code: 'T3', label: 'T3', description: '局部和/或区域扩散' },
  { code: 'T3a', label: 'T3a', description: '浆膜层和/或附件' },
  { code: 'T3b', label: 'T3b', description: '阴道和/或子宫旁' },
  { code: 'T4', label: 'T4', description: '侵犯膀胱/直肠黏膜' },
];

const N_OPTIONS: StagingOption[] = [
  { code: 'N0', label: 'N0', description: '无区域淋巴结转移' },
  { code: 'N1', label: 'N1', description: '盆腔淋巴结转移' },
  { code: 'N2', label: 'N2', description: '腹主动脉淋巴结转移' },
];

const M_OPTIONS: StagingOption[] = [
  { code: 'M0', label: 'M0', description: '无远处转移' },
  { code: 'M1', label: 'M1', description: '远处转移' },
];

function calculateFIGO(t: string, n: string, m: string): { stage: string; color: string; note: string; riskLevel: string } {
  if (m === 'M1') {
    return { stage: 'IVB', color: '#ef4444', note: '远处转移，预后差', riskLevel: '极高危' };
  }

  if (t === 'T4') {
    return { stage: 'IVA', color: '#ef4444', note: '膀胱/直肠浸润', riskLevel: '极高危' };
  }

  if (n === 'N2') {
    return { stage: 'IIIC2', color: '#f97316', note: '腹主动脉旁淋巴结阳性', riskLevel: '高危' };
  }

  if (n === 'N1') {
    return { stage: 'IIIC1', color: '#f97316', note: '盆腔淋巴结阳性', riskLevel: '高危' };
  }

  if (t === 'T3b') {
    return { stage: 'IIIB', color: '#f97316', note: '阴道和/或子宫旁浸润', riskLevel: '高危' };
  }
  if (t === 'T3a') {
    return { stage: 'IIIA', color: '#f97316', note: '浆膜层和/或附件浸润', riskLevel: '高危' };
  }
  if (t === 'T3') {
    return { stage: 'III', color: '#f97316', note: '局部扩散', riskLevel: '高危' };
  }

  if (t === 'T2') {
    return { stage: 'II', color: '#f59e0b', note: '宫颈间质浸润', riskLevel: '中危' };
  }

  if (t.startsWith('T1')) {
    return { stage: 'I', color: '#22c55e', note: '限于子宫体，预后好', riskLevel: '低危' };
  }

  return { stage: 'Unknown', color: '#6b7280', note: '请选择完整分期信息', riskLevel: '' };
}

export function FIGOEndometrial() {
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
          FIGO 分期 · 子宫内膜癌 (2009)
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          基于手术病理的子宫内膜癌分期系统。选择 T、N、M 类别以计算 FIGO 分期。
          <br />
          <span className="opacity-70">注：2023年 FIGO 已发布修订版分期（含分子分型），本计算器为 2009 版。</span>
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
        <p><strong>I 期</strong>：限于子宫体，5 年生存率 &gt;90%</p>
        <p><strong>II 期</strong>：宫颈间质浸润，5 年生存率 75-85%</p>
        <p><strong>III 期</strong>：局部扩散或淋巴结阳性，5 年生存率 50-70%</p>
        <p><strong>IIIC1</strong>：盆腔淋巴结转移；<strong>IIIC2</strong>：腹主动脉旁淋巴结转移</p>
        <p><strong>IV 期</strong>：远处转移或邻近器官，5 年生存率 &lt;20%</p>
        <p className="mt-2 opacity-80">* 分期基于手术病理。临床分期用于无法手术者。</p>
        <p className="mt-1 opacity-80">* 参考：FIGO Committee on Gynecologic Oncology. <em>Int J Gynaecol Obstet</em> 2009; 105: 3–4.</p>
      </CalculatorNotes>

      <CalculatorDisclaimer />
    </div>
  );
}
