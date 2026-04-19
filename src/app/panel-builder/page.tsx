'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { IconScale, IconArrowRight, IconCheck, IconX, IconSearch } from '@/components/Icon';

/* ── Types ──────────────────────────────────────────────────── */

interface MorphologyPattern {
  id: string;
  nameZh: string;
  nameEn: string;
  icon: string;
  description: string;
}

interface AnatomicSite {
  id: string;
  nameZh: string;
  nameEn: string;
}

interface Rule {
  diagnosis: string;
  diseaseId: string;
  requiredPositive: string[];
  requiredNegative: string[];
  supportingPositive: string[];
  supportingNegative: string[];
  confidence: 'high' | 'medium' | 'low';
  nextSteps: string[];
}

interface Scenario {
  id: string;
  sourceId: string;
  morphology: string;
  sites: string[];
  titleZh: string;
  titleEn: string;
  firstLineMarkers: string[];
  secondLineMarkers: string[];
  rules: Rule[];
  /** Set by enhancement pipeline. Holds China-specific lab IHC panel
   *  recommendation (firstLine / secondLine markerId arrays + cost note). */
  _enhance_panel_cn_recommendation?: {
    panels?: {
      firstLine?: string[];
      secondLine?: string[];
      costNote?: string;
    };
  };
}

interface PanelData {
  morphologyPatterns: MorphologyPattern[];
  anatomicSites: AnatomicSite[];
  scenarios: Scenario[];
}

type MarkerResult = '+' | '-' | '±' | '未做';

interface ScoredRule {
  rule: Rule;
  score: number;
  maxScore: number;
  pct: number;
  supporting: string[];
  contradicting: string[];
}

/* ── Icon color map ─────────────────────────────────────────── */

const MORPH_COLORS: Record<string, string> = {
  spindle: '#6366f1',
  round: '#ec4899',
  epithelioid: '#f59e0b',
  pleomorphic: '#ef4444',
  papillary: '#10b981',
  clear: '#06b6d4',
  glandular: '#8b5cf6',
  neuroendocrine: '#3b82f6',
  lymphoid: '#14b8a6',
  melanocytic: '#64748b',
};

/* ── Confidence helpers ─────────────────────────────────────── */

const confidenceLabel: Record<string, string> = { high: '高', medium: '中', low: '低' };
const confidenceColor: Record<string, string> = {
  high: 'var(--success)',
  medium: 'var(--warning)',
  low: 'var(--danger)',
};

/* ── Step indicator ─────────────────────────────────────────── */

const STEP_LABELS = ['选择形态', '构建面板', '填写结果', '分析结果'];

function StepIndicator({ current, onGo }: { current: number; onGo: (s: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => done && onGo(step)}
              disabled={!done}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 20,
                border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: active ? 'var(--accent)' : done ? 'var(--card)' : 'transparent',
                color: active ? '#fff' : done ? 'var(--accent)' : 'var(--fg-muted)',
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                cursor: done ? 'pointer' : 'default',
                transition: 'all .2s',
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  background: active ? 'rgba(255,255,255,0.25)' : done ? 'var(--accent)' : 'var(--border)',
                  color: active || done ? '#fff' : 'var(--fg-muted)',
                }}
              >
                {done ? <IconCheck size={13} /> : step}
              </span>
              {label}
            </button>
            {i < STEP_LABELS.length - 1 && (
              <IconArrowRight size={14} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */

export default function PanelBuilderPage() {
  const [data, setData] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);

  // Step 1 state
  const [selectedMorphology, setSelectedMorphology] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);

  // Step 2 state
  const [checkedMarkers, setCheckedMarkers] = useState<Set<string>>(new Set());

  // Step 3 state
  const [markerResults, setMarkerResults] = useState<Record<string, MarkerResult>>({});

  // Fetch data
  useEffect(() => {
    fetch('/api/panel-builder')
      .then((r) => r.json())
      .then((d: PanelData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* ── Step 1 helpers ─────────────────────────────────────── */

  const matchingScenarios = useMemo(() => {
    if (!data || !selectedMorphology) return [];
    return data.scenarios.filter((s) => {
      if (s.morphology !== selectedMorphology) return false;
      if (selectedSite && !s.sites.includes(selectedSite) && !s.sites.includes('any')) return false;
      return true;
    });
  }, [data, selectedMorphology, selectedSite]);

  // Auto-advance when exactly 1 scenario
  useEffect(() => {
    if (matchingScenarios.length === 1 && !selectedScenario) {
      setSelectedScenario(matchingScenarios[0]);
    }
  }, [matchingScenarios, selectedScenario]);

  const handleSelectScenario = useCallback((sc: Scenario) => {
    setSelectedScenario(sc);
  }, []);

  const goToStep2 = useCallback(() => {
    if (!selectedScenario) return;
    const initial = new Set(selectedScenario.firstLineMarkers);
    setCheckedMarkers(initial);
    setStep(2);
  }, [selectedScenario]);

  /* ── Step 2 helpers ─────────────────────────────────────── */

  const toggleMarker = useCallback((m: string) => {
    setCheckedMarkers((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }, []);

  const goToStep3 = useCallback(() => {
    const initial: Record<string, MarkerResult> = {};
    checkedMarkers.forEach((m) => (initial[m] = '未做'));
    setMarkerResults(initial);
    setStep(3);
  }, [checkedMarkers]);

  /* ── Step 3 helpers ─────────────────────────────────────── */

  const setResult = useCallback((marker: string, result: MarkerResult) => {
    setMarkerResults((prev) => ({ ...prev, [marker]: result }));
  }, []);

  const filledCount = useMemo(
    () => Object.values(markerResults).filter((v) => v !== '未做').length,
    [markerResults],
  );

  /* ── Step 4: scoring ────────────────────────────────────── */

  const scoredRules: ScoredRule[] = useMemo(() => {
    if (!selectedScenario) return [];

    return selectedScenario.rules
      .map((rule) => {
        let score = 0;
        let maxScore = 0;
        const supporting: string[] = [];
        const contradicting: string[] = [];

        const check = (markers: string[], weight: number, expectPositive: boolean) => {
          markers.forEach((m) => {
            maxScore += Math.abs(weight);
            const r = markerResults[m];
            if (!r || r === '未做' || r === '±') return;
            if (expectPositive && r === '+') {
              score += weight;
              supporting.push(m);
            } else if (!expectPositive && r === '-') {
              score += weight;
              supporting.push(m);
            } else if (expectPositive && r === '-') {
              score -= 3;
              contradicting.push(m);
            } else if (!expectPositive && r === '+') {
              score -= 3;
              contradicting.push(m);
            }
          });
        };

        check(rule.requiredPositive, 2, true);
        check(rule.requiredNegative, 2, false);
        check(rule.supportingPositive, 1, true);
        check(rule.supportingNegative, 1, false);

        const pct = maxScore > 0 ? Math.max(0, Math.round((score / maxScore) * 100)) : 0;
        return { rule, score, maxScore, pct, supporting, contradicting };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [selectedScenario, markerResults]);

  /* ── Reset ──────────────────────────────────────────────── */

  const reset = useCallback(() => {
    setStep(1);
    setSelectedMorphology(null);
    setSelectedSite(null);
    setSelectedScenario(null);
    setCheckedMarkers(new Set());
    setMarkerResults({});
  }, []);

  /* ── Navigation ─────────────────────────────────────────── */

  const goToStep = useCallback(
    (s: number) => {
      if (s < step) setStep(s);
    },
    [step],
  );

  /* ── Render ─────────────────────────────────────────────── */

  if (loading) {
    return (
      <div style={{ maxWidth: 896, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--fg-muted)' }}>加载面板数据中...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ maxWidth: 896, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)' }}>无法加载面板数据</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 896, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <IconScale size={26} style={{ color: 'var(--accent)' }} />
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>IHC 面板构建器</h1>
      </div>
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginBottom: 20 }}>
        根据形态学模式选择标记物面板，填写结果后智能推断诊断方向
      </p>

      <StepIndicator current={step} onGo={goToStep} />

      {/* ═══ Step 1 ═══ */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>选择形态学模式</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 10,
              marginBottom: 24,
            }}
          >
            {data.morphologyPatterns.map((m) => {
              const active = selectedMorphology === m.id;
              const color = MORPH_COLORS[m.icon] || 'var(--accent)';
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMorphology(m.id);
                    setSelectedScenario(null);
                  }}
                  style={{
                    border: active ? `2px solid ${color}` : '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 12,
                    background: active ? `${color}11` : 'var(--card)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all .15s',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: `${color}22`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px',
                      fontSize: 20,
                      color,
                      fontWeight: 700,
                    }}
                  >
                    {m.nameZh.charAt(0)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{m.nameZh}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{m.nameEn}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--fg-muted)',
                      marginTop: 4,
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {m.description}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Anatomic site filter */}
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>解剖部位筛选（可选）</h2>
          <div
            style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              paddingBottom: 8,
              marginBottom: 20,
            }}
          >
            <button
              onClick={() => {
                setSelectedSite(null);
                setSelectedScenario(null);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 16,
                border: !selectedSite ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: !selectedSite ? 'var(--accent)' : 'var(--card)',
                color: !selectedSite ? '#fff' : 'var(--fg)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              全部
            </button>
            {data.anatomicSites.map((s) => {
              const active = selectedSite === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedSite(s.id);
                    setSelectedScenario(null);
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 16,
                    border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: active ? 'var(--accent)' : 'var(--card)',
                    color: active ? '#fff' : 'var(--fg)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {s.nameZh}
                </button>
              );
            })}
          </div>

          {/* Matching scenarios */}
          {selectedMorphology && matchingScenarios.length > 1 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                <IconSearch size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                匹配方案（{matchingScenarios.length}）
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {matchingScenarios.map((sc) => {
                  const active = selectedScenario?.id === sc.id;
                  return (
                    <button
                      key={sc.id}
                      onClick={() => handleSelectScenario(sc)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: active ? 'color-mix(in srgb, var(--accent) 8%, var(--card))' : 'var(--card)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{sc.titleZh}</div>
                        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{sc.titleEn}</div>
                      </div>
                      {active && <IconCheck size={16} style={{ color: 'var(--accent)' }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedMorphology && matchingScenarios.length === 0 && (
            <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>
              没有匹配的方案，请尝试其他形态或部位组合
            </p>
          )}

          {/* Next button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              disabled={!selectedScenario}
              onClick={goToStep2}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: selectedScenario ? 'var(--accent)' : 'var(--border)',
                color: selectedScenario ? '#fff' : 'var(--fg-muted)',
                fontWeight: 600,
                fontSize: 14,
                cursor: selectedScenario ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              下一步 <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ Step 2 ═══ */}
      {step === 2 && selectedScenario && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{selectedScenario.titleZh}</h2>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
            {selectedScenario.titleEn}
          </p>

          {/* First line */}
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--success)' }}>
            首选标记物
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {selectedScenario.firstLineMarkers.map((m) => {
              const checked = checkedMarkers.has(m);
              return (
                <button
                  key={m}
                  onClick={() => toggleMarker(m)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: checked ? '2px solid var(--success)' : '1px solid var(--border)',
                    background: checked ? 'color-mix(in srgb, var(--success) 12%, var(--card))' : 'var(--card)',
                    color: checked ? 'var(--success)' : 'var(--fg)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {checked && <IconCheck size={14} />}
                  {m}
                </button>
              );
            })}
          </div>

          {/* Second line */}
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--warning)' }}>
            补充标记物
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {selectedScenario.secondLineMarkers.map((m) => {
              const checked = checkedMarkers.has(m);
              return (
                <button
                  key={m}
                  onClick={() => toggleMarker(m)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: checked ? '2px solid var(--warning)' : '1px solid var(--border)',
                    background: checked ? 'color-mix(in srgb, var(--warning) 12%, var(--card))' : 'var(--card)',
                    color: checked ? 'var(--warning)' : 'var(--fg)',
                    fontWeight: 500,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {checked && <IconCheck size={14} />}
                  {m}
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16 }}>
            已选择 {checkedMarkers.size} 个标记物
          </p>

          {/* China-specific lab panel recommendation (enhancement) */}
          {selectedScenario._enhance_panel_cn_recommendation?.panels && (
            <div
              style={{
                marginBottom: 24,
                padding: 14,
                borderRadius: 10,
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span aria-hidden>🇨🇳</span>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#10b981', margin: 0 }}>
                  国内实验室常用套餐（推荐）
                </h4>
              </div>
              {selectedScenario._enhance_panel_cn_recommendation.panels.firstLine && selectedScenario._enhance_panel_cn_recommendation.panels.firstLine.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginRight: 6 }}>一线（必做）：</span>
                  {selectedScenario._enhance_panel_cn_recommendation.panels.firstLine.map((m) => (
                    <span key={m} style={{
                      display: 'inline-block',
                      fontSize: 11, padding: '2px 8px', borderRadius: 12, marginRight: 4, marginBottom: 4,
                      background: 'rgba(16,185,129,0.12)', color: '#10b981', fontFamily: 'var(--font-mono)',
                    }}>
                      {m}
                    </span>
                  ))}
                </div>
              )}
              {selectedScenario._enhance_panel_cn_recommendation.panels.secondLine && selectedScenario._enhance_panel_cn_recommendation.panels.secondLine.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginRight: 6 }}>二线（按需）：</span>
                  {selectedScenario._enhance_panel_cn_recommendation.panels.secondLine.map((m) => (
                    <span key={m} style={{
                      display: 'inline-block',
                      fontSize: 11, padding: '2px 8px', borderRadius: 12, marginRight: 4, marginBottom: 4,
                      background: 'var(--card-hover)', color: 'var(--fg)', fontFamily: 'var(--font-mono)',
                    }}>
                      {m}
                    </span>
                  ))}
                </div>
              )}
              {selectedScenario._enhance_panel_cn_recommendation.panels.costNote && (
                <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6, lineHeight: 1.5 }}>
                  {selectedScenario._enhance_panel_cn_recommendation.panels.costNote}
                </p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => setStep(1)}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--fg)',
                fontWeight: 500,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              上一步
            </button>
            <button
              disabled={checkedMarkers.size === 0}
              onClick={goToStep3}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: checkedMarkers.size > 0 ? 'var(--accent)' : 'var(--border)',
                color: checkedMarkers.size > 0 ? '#fff' : 'var(--fg-muted)',
                fontWeight: 600,
                fontSize: 14,
                cursor: checkedMarkers.size > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              开始判读 <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ Step 3 ═══ */}
      {step === 3 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>填写免疫组化结果</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {Object.keys(markerResults).map((marker) => {
              const val = markerResults[marker];
              const options: { label: string; value: MarkerResult; color: string }[] = [
                { label: '阳性(+)', value: '+', color: 'var(--success)' },
                { label: '阴性(-)', value: '-', color: 'var(--danger)' },
                { label: '可疑(±)', value: '±', color: 'var(--warning)' },
                { label: '未做', value: '未做', color: 'var(--fg-muted)' },
              ];

              return (
                <div
                  key={marker}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 14, minWidth: 80 }}>{marker}</span>
                  <div style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {options.map((opt) => {
                      const active = val === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setResult(marker, opt.value)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 6,
                            border: active ? `2px solid ${opt.color}` : '1px solid var(--border)',
                            background: active ? `color-mix(in srgb, ${opt.color} 15%, var(--card))` : 'transparent',
                            color: active ? opt.color : 'var(--fg-muted)',
                            fontWeight: active ? 700 : 500,
                            fontSize: 13,
                            cursor: 'pointer',
                            transition: 'all .15s',
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16 }}>
            已填写 {filledCount} / {Object.keys(markerResults).length} 个标记物
          </p>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => setStep(2)}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--fg)',
                fontWeight: 500,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              上一步
            </button>
            <button
              disabled={filledCount < 2}
              onClick={() => setStep(4)}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: filledCount >= 2 ? 'var(--accent)' : 'var(--border)',
                color: filledCount >= 2 ? '#fff' : 'var(--fg-muted)',
                fontWeight: 600,
                fontSize: 14,
                cursor: filledCount >= 2 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              查看结果 <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ Step 4 ═══ */}
      {step === 4 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>诊断分析结果</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {scoredRules.map((sr, idx) => (
              <ResultCard key={idx} sr={sr} />
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <button
              onClick={() => setStep(3)}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--fg)',
                fontWeight: 500,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              返回修改
            </button>
            <button
              onClick={reset}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              重新开始
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Result card component ──────────────────────────────────── */

function ResultCard({ sr }: { sr: ScoredRule }) {
  const [expanded, setExpanded] = useState(false);
  const { rule, pct, supporting, contradicting } = sr;
  const confColor = confidenceColor[rule.confidence];

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 16,
        background: 'var(--card)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: confColor }}>{rule.diagnosis}</span>
        </div>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
            background: `color-mix(in srgb, ${confColor} 15%, var(--card))`,
            color: confColor,
            flexShrink: 0,
          }}
        >
          {confidenceLabel[rule.confidence]}可信度
        </span>
      </div>

      {/* Score bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: 'var(--fg-muted)' }}>匹配度</span>
          <span style={{ fontWeight: 700, color: pct >= 60 ? 'var(--success)' : pct >= 30 ? 'var(--warning)' : 'var(--danger)' }}>
            {pct}%
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 3,
              background: pct >= 60 ? 'var(--success)' : pct >= 30 ? 'var(--warning)' : 'var(--danger)',
              transition: 'width .4s ease',
            }}
          />
        </div>
      </div>

      {/* Supporting evidence */}
      {supporting.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)' }}>支持证据</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {supporting.map((m) => (
              <span
                key={m}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  background: 'color-mix(in srgb, var(--success) 12%, var(--card))',
                  color: 'var(--success)',
                  fontWeight: 500,
                }}
              >
                <IconCheck size={12} /> {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contradicting evidence */}
      {contradicting.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)' }}>反对证据</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {contradicting.map((m) => (
              <span
                key={m}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  background: 'color-mix(in srgb, var(--danger) 12%, var(--card))',
                  color: 'var(--danger)',
                  fontWeight: 500,
                }}
              >
                <IconX size={12} /> {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Next steps (collapsible) */}
      {rule.nextSteps.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <IconArrowRight
              size={12}
              style={{
                transform: expanded ? 'rotate(90deg)' : 'none',
                transition: 'transform .2s',
              }}
            />
            建议下一步
          </button>
          {expanded && (
            <ul
              style={{
                margin: '6px 0 0',
                paddingLeft: 18,
                fontSize: 13,
                color: 'var(--fg)',
                lineHeight: 1.6,
              }}
            >
              {rule.nextSteps.map((ns, i) => (
                <li key={i}>{ns}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Disease link */}
      {rule.diseaseId && (
        <div style={{ marginTop: 10 }}>
          <a
            href={`/atlas/soft-tissue/${rule.diseaseId}`}
            style={{
              fontSize: 12,
              color: 'var(--accent)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            查看疾病详情 &rarr;
          </a>
        </div>
      )}
    </div>
  );
}
