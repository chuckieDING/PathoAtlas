'use client';

import { useState } from 'react';

/**
 * FIGO staging for cervical cancer (2018 revision).
 * Based on clinical and pathological findings.
 *
 * T categories:
 * - T1: Confined to cervix
 * - T2: Invades beyond cervix but not to pelvic wall
 * - T3: Extends to pelvic wall or lower third vagina
 * - T4: Invades bladder/rectal mucosa or beyond true pelvis
 *
 * N categories:
 * - N0: No regional lymph node metastasis
 * - N1: Regional lymph node metastasis
 *
 * M categories:
 * - M0: No distant metastasis
 * - M1: Distant metastasis
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
  { code: 'N1', label: 'N1', description: '区域淋巴结转移' },
];

const M_OPTIONS: StagingOption[] = [
  { code: 'M0', label: 'M0', description: '无远处转移' },
  { code: 'M1', label: 'M1', description: '远处转移' },
];

function calculateFIGO(t: string, n: string, m: string): { stage: string; color: string; note: string } {
  if (m === 'M1') {
    return {
      stage: 'IVB',
      color: '#ef4444',
      note: '远处转移，预后差',
    };
  }

  if (n === 'N1') {
    if (t.startsWith('T3')) {
      return {
        stage: 'IIIC2',
        color: '#f97316',
        note: '盆壁浸润 + 淋巴结阳性',
      };
    }
    return {
      stage: 'IIIC1',
      color: '#f97316',
      note: '淋巴结阳性',
    };
  }

  if (t === 'T4') {
    return {
      stage: 'IVA',
      color: '#ef4444',
      note: '邻近器官浸润',
    };
  }

  if (t.startsWith('T3')) {
    return {
      stage: 'III',
      color: '#f97316',
      note: '局部晚期',
    };
  }

  if (t.startsWith('T2')) {
    return {
      stage: 'II',
      color: '#f59e0b',
      note: '超出宫颈',
    };
  }

  if (t.startsWith('T1')) {
    return {
      stage: 'I',
      color: '#22c55e',
      note: '限于宫颈，预后好',
    };
  }

  return {
    stage: 'Unknown',
    color: '#6b7280',
    note: '请选择完整分期信息',
  };
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

      <StagingGroup
        label="T · 原发肿瘤"
        value={t}
        onChange={setT}
        options={T_OPTIONS}
      />
      <StagingGroup
        label="N · 区域淋巴结"
        value={n}
        onChange={setN}
        options={N_OPTIONS}
      />
      <StagingGroup
        label="M · 远处转移"
        value={m}
        onChange={setM}
        options={M_OPTIONS}
      />

      <div
        className="rounded-lg p-4 mt-4"
        style={{ background: 'var(--card-hover)', border: `2px solid ${result.color}` }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>FIGO Stage</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
              {t} {n} {m}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>分期</div>
            <div className="text-base font-bold" style={{ color: result.color }}>
              Stage {result.stage}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
              {result.note}
            </div>
          </div>
        </div>
      </div>

      <details className="text-xs" style={{ color: 'var(--fg-muted)' }}>
        <summary className="cursor-pointer hover:underline select-none">分期含义与注意事项</summary>
        <div className="mt-2 space-y-1.5 pl-3 leading-relaxed">
          <p>
            <strong>I 期</strong>：限于宫颈，5 年生存率 >90%
          </p>
          <p>
            <strong>II 期</strong>：超出宫颈但未达盆壁，5 年生存率 65-80%
          </p>
          <p>
            <strong>III 期</strong>：达盆壁或淋巴结阳性，5 年生存率 35-50%
          </p>
          <p>
            <strong>IV 期</strong>：远处转移或邻近器官，5 年生存率 <20%
          </p>
          <p className="mt-2 opacity-80">
            * 分期基于临床检查、影像学和病理。手术后可重新分期。
          </p>
          <p className="mt-1 opacity-80">
            * 参考：FIGO Committee on Gynecologic Oncology. <em>Int J Gynaecol Obstet</em> 2019; 145: 129–35.
          </p>
        </div>
      </details>
    </div>
  );
}

function StagingGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: StagingOption[];
}) {
  return (
    <div>
      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--fg)' }}>
        {label}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((opt) => {
          const active = value === opt.code;
          return (
            <button
              key={opt.code}
              onClick={() => onChange(opt.code)}
              className="rounded-lg p-3 text-left transition-colors"
              style={{
                background: active ? 'rgba(99,102,241,0.12)' : 'var(--card-hover)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
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