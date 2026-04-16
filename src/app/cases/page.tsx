'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  IconMicroscope,
  IconChevronRight,
  IconCheck,
  IconCheckCircle,
  IconBookOpen,
  IconArrowRight,
  IconStar,
  IconInfo,
} from '@/components/Icon';

/* ── Types ──────────────────────────────────────────────────── */

interface StepMC {
  step: number;
  prompt: string;
  type: 'multiple-choice';
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface StepMarker {
  step: number;
  prompt: string;
  type: 'marker-select';
  recommendedMarkers: string[];
  results: Record<string, string>;
  explanation: string;
}

type CaseStep = StepMC | StepMarker;

interface VirtualCase {
  id: string;
  titleZh: string;
  difficulty: 'easy' | 'medium' | 'hard';
  organ: string;
  clinicalHistory: string;
  grossDescription: string;
  microscopyClues: string[];
  steps: CaseStep[];
  finalDiagnosis: string;
  keyLearningPoints: string[];
  relatedDiseaseIds: string[];
  relatedMarkerIds: string[];
  expertCommentary: string;
}

/* ── Constants ──────────────────────────────────────────────── */

const DIFFICULTY_META: Record<string, { label: string; color: string; bg: string }> = {
  easy: { label: '简单', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  medium: { label: '中等', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  hard: { label: '困难', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const ORGAN_LABELS: Record<string, string> = {
  breast: '乳腺',
  lung: '肺',
  gi: '消化道',
  liver: '肝脏',
  thyroid: '甲状腺',
  gynecology: '妇科',
  lymphoma: '淋巴造血',
  kidney: '肾脏',
  skin: '皮肤',
  'soft-tissue': '软组织',
  cns: '中枢神经',
};

/* ── Page Component ─────────────────────────────────────────── */

export default function CasesPage() {
  const [cases, setCases] = useState<VirtualCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [organFilter, setOrganFilter] = useState<string>('all');

  // Step viewer state
  const [currentStep, setCurrentStep] = useState(0);
  const [answeredSteps, setAnsweredSteps] = useState<Record<number, boolean>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [selectedMarkers, setSelectedMarkers] = useState<Record<number, string[]>>({});
  const [revealedClues, setRevealedClues] = useState(1);
  const [showFinal, setShowFinal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/cases');
        const data = await res.json();
        setCases(Array.isArray(data) ? data : []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const organs = useMemo(() => {
    const set = new Set(cases.map((c) => c.organ));
    return Array.from(set).sort();
  }, [cases]);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (difficultyFilter !== 'all' && c.difficulty !== difficultyFilter) return false;
      if (organFilter !== 'all' && c.organ !== organFilter) return false;
      return true;
    });
  }, [cases, difficultyFilter, organFilter]);

  const selectedCase = cases.find((c) => c.id === selectedId) ?? null;

  function openCase(id: string) {
    setSelectedId(id);
    setCurrentStep(0);
    setAnsweredSteps({});
    setSelectedOptions({});
    setSelectedMarkers({});
    setRevealedClues(1);
    setShowFinal(false);
  }

  function closeCase() {
    setSelectedId(null);
  }

  /* ── Loading ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse" style={{ color: 'var(--fg-muted)' }}>
          加载中...
        </div>
      </div>
    );
  }

  /* ── Case Viewer ──────────────────────────────────────────── */
  if (selectedCase) {
    const steps = selectedCase.steps;
    const step = steps[currentStep] as CaseStep | undefined;

    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Back button */}
          <button
            onClick={closeCase}
            className="flex items-center gap-1 text-sm mb-6 px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--accent)', background: 'transparent' }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'var(--card-hover)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'transparent')
            }
          >
            <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}>
              <IconChevronRight size={16} />
            </span>
            返回列表
          </button>

          {/* Case Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                {selectedCase.titleZh}
              </h1>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  color: DIFFICULTY_META[selectedCase.difficulty].color,
                  background: DIFFICULTY_META[selectedCase.difficulty].bg,
                }}
              >
                {DIFFICULTY_META[selectedCase.difficulty].label}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}
              >
                {ORGAN_LABELS[selectedCase.organ] ?? selectedCase.organ}
              </span>
            </div>
          </div>

          {/* Clinical History */}
          <Section title="临床病史" icon={<IconBookOpen size={18} />}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>
              {selectedCase.clinicalHistory}
            </p>
          </Section>

          {/* Gross Description */}
          <Section title="大体检查" icon={<IconInfo size={18} />}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>
              {selectedCase.grossDescription}
            </p>
          </Section>

          {/* Microscopy Clues */}
          <Section title="镜下线索" icon={<IconMicroscope size={18} />}>
            <div className="space-y-2">
              {selectedCase.microscopyClues.map((clue, i) => (
                <div
                  key={i}
                  className="text-sm leading-relaxed flex items-start gap-2 transition-all duration-300"
                  style={{
                    color: i < revealedClues ? 'var(--fg)' : 'var(--fg-muted)',
                    opacity: i < revealedClues ? 1 : 0.3,
                    filter: i < revealedClues ? 'none' : 'blur(4px)',
                    userSelect: i < revealedClues ? 'auto' : 'none',
                  }}
                >
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{
                      background: i < revealedClues ? 'var(--accent)' : 'var(--border)',
                      color: '#fff',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>{clue}</span>
                </div>
              ))}
              {revealedClues < selectedCase.microscopyClues.length && (
                <button
                  onClick={() => setRevealedClues((r) => r + 1)}
                  className="text-xs mt-2 px-3 py-1 rounded-lg transition-colors"
                  style={{
                    color: 'var(--accent)',
                    background: 'var(--card-hover)',
                    border: '1px solid var(--border)',
                  }}
                >
                  显示下一条线索
                </button>
              )}
            </div>
          </Section>

          {/* Step Progress */}
          {!showFinal && (
            <div className="flex items-center gap-2 mb-6">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => answeredSteps[i] !== undefined && setCurrentStep(i)}
                  className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all"
                  style={{
                    background:
                      i === currentStep
                        ? 'var(--accent)'
                        : answeredSteps[i]
                          ? 'var(--success)'
                          : 'var(--card)',
                    color: i === currentStep || answeredSteps[i] ? '#fff' : 'var(--fg-muted)',
                    border: `2px solid ${i === currentStep ? 'var(--accent)' : answeredSteps[i] ? 'var(--success)' : 'var(--border)'}`,
                    cursor: answeredSteps[i] !== undefined ? 'pointer' : 'default',
                  }}
                >
                  {answeredSteps[i] ? <IconCheck size={14} /> : i + 1}
                </button>
              ))}
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                步骤 {currentStep + 1}/{steps.length}
              </span>
            </div>
          )}

          {/* Current Step */}
          {!showFinal && step && (
            <div
              className="rounded-2xl p-6 mb-6 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <h3 className="font-bold mb-4" style={{ color: 'var(--fg)' }}>
                {step.prompt}
              </h3>

              {/* Multiple Choice */}
              {step.type === 'multiple-choice' && (
                <div className="space-y-2">
                  {(step as StepMC).options.map((opt, oi) => {
                    const answered = answeredSteps[currentStep];
                    const isSelected = selectedOptions[currentStep] === oi;
                    const isCorrect = oi === (step as StepMC).correctIndex;

                    let borderColor = 'var(--border)';
                    let bg = 'var(--bg-secondary)';
                    if (answered) {
                      if (isCorrect) {
                        borderColor = 'var(--success)';
                        bg = 'rgba(34,197,94,0.08)';
                      } else if (isSelected && !isCorrect) {
                        borderColor = 'var(--danger)';
                        bg = 'rgba(239,68,68,0.08)';
                      }
                    } else if (isSelected) {
                      borderColor = 'var(--accent)';
                      bg = 'rgba(99,102,241,0.08)';
                    }

                    return (
                      <button
                        key={oi}
                        disabled={!!answered}
                        onClick={() =>
                          setSelectedOptions((prev) => ({ ...prev, [currentStep]: oi }))
                        }
                        className="w-full text-left rounded-xl px-4 py-3 text-sm transition-all border"
                        style={{ borderColor, background: bg, color: 'var(--fg)' }}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{
                              background:
                                answered && isCorrect ? 'var(--success)' : 'var(--card-hover)',
                              color: answered && isCorrect ? '#fff' : 'var(--fg-muted)',
                            }}
                          >
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt}
                          {answered && isCorrect && (
                            <IconCheckCircle
                              size={16}
                              style={{ color: 'var(--success)', marginLeft: 'auto' }}
                            />
                          )}
                        </span>
                      </button>
                    );
                  })}

                  {/* Submit MC answer */}
                  {!answeredSteps[currentStep] && selectedOptions[currentStep] !== undefined && (
                    <button
                      onClick={() =>
                        setAnsweredSteps((prev) => ({ ...prev, [currentStep]: true }))
                      }
                      className="mt-3 px-5 py-2 rounded-xl text-sm font-medium text-white transition-colors"
                      style={{ background: 'var(--accent)' }}
                    >
                      提交答案
                    </button>
                  )}
                </div>
              )}

              {/* Marker Select */}
              {step.type === 'marker-select' && (
                <div>
                  <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                    点击选择你认为应该使用的免疫组化标记物：
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      ...(step as StepMarker).recommendedMarkers,
                      'CD45',
                      'PLAP',
                      'Calretinin',
                    ].map((marker) => {
                      const toggled = (selectedMarkers[currentStep] ?? []).includes(marker);
                      const answered = answeredSteps[currentStep];
                      const isRecommended = (step as StepMarker).recommendedMarkers.includes(
                        marker
                      );

                      let chipBg = 'var(--bg-secondary)';
                      let chipBorder = 'var(--border)';
                      let chipColor = 'var(--fg)';
                      if (answered) {
                        if (toggled && isRecommended) {
                          chipBg = 'rgba(34,197,94,0.15)';
                          chipBorder = 'var(--success)';
                          chipColor = 'var(--success)';
                        } else if (toggled && !isRecommended) {
                          chipBg = 'rgba(239,68,68,0.1)';
                          chipBorder = 'var(--danger)';
                          chipColor = 'var(--danger)';
                        } else if (!toggled && isRecommended) {
                          chipBg = 'rgba(245,158,11,0.1)';
                          chipBorder = 'var(--warning)';
                          chipColor = 'var(--warning)';
                        }
                      } else if (toggled) {
                        chipBg = 'rgba(99,102,241,0.15)';
                        chipBorder = 'var(--accent)';
                        chipColor = 'var(--accent)';
                      }

                      return (
                        <button
                          key={marker}
                          disabled={!!answered}
                          onClick={() => {
                            setSelectedMarkers((prev) => {
                              const curr = prev[currentStep] ?? [];
                              return {
                                ...prev,
                                [currentStep]: curr.includes(marker)
                                  ? curr.filter((m) => m !== marker)
                                  : [...curr, marker],
                              };
                            });
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                          style={{
                            background: chipBg,
                            borderColor: chipBorder,
                            color: chipColor,
                          }}
                        >
                          {marker}
                        </button>
                      );
                    })}
                  </div>

                  {/* Submit markers */}
                  {!answeredSteps[currentStep] &&
                    (selectedMarkers[currentStep] ?? []).length > 0 && (
                      <button
                        onClick={() =>
                          setAnsweredSteps((prev) => ({ ...prev, [currentStep]: true }))
                        }
                        className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-colors"
                        style={{ background: 'var(--accent)' }}
                      >
                        提交选择
                      </button>
                    )}

                  {/* Marker results */}
                  {answeredSteps[currentStep] && (
                    <div
                      className="mt-4 rounded-xl p-4 border"
                      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                    >
                      <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--fg)' }}>
                        免疫组化结果：
                      </h4>
                      <div className="space-y-2">
                        {Object.entries((step as StepMarker).results).map(([marker, result]) => (
                          <div key={marker} className="flex items-center gap-3 text-sm">
                            <span
                              className="font-medium min-w-[80px]"
                              style={{ color: 'var(--accent)' }}
                            >
                              {marker}
                            </span>
                            <span style={{ color: 'var(--fg)' }}>{result}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Explanation */}
              {answeredSteps[currentStep] && (
                <div
                  className="mt-4 rounded-xl p-4 border-l-4"
                  style={{
                    background: 'rgba(99,102,241,0.06)',
                    borderColor: 'var(--accent)',
                  }}
                >
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>
                    {step.explanation}
                  </p>
                </div>
              )}

              {/* Next step */}
              {answeredSteps[currentStep] && (
                <div className="mt-4 flex justify-end">
                  {currentStep < steps.length - 1 ? (
                    <button
                      onClick={() => setCurrentStep((s) => s + 1)}
                      className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
                      style={{ background: 'var(--accent)' }}
                    >
                      下一步
                      <IconArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowFinal(true)}
                      className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
                      style={{ background: 'var(--success)' }}
                    >
                      查看最终诊断
                      <IconArrowRight size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Final Diagnosis & Summary */}
          {showFinal && (
            <div className="space-y-6">
              {/* Final Diagnosis */}
              <div
                className="rounded-2xl p-6 border-2"
                style={{ borderColor: 'var(--success)', background: 'rgba(34,197,94,0.05)' }}
              >
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2" style={{ color: 'var(--success)' }}>
                  <IconCheckCircle size={22} />
                  最终诊断
                </h3>
                <p className="text-base font-medium" style={{ color: 'var(--fg)' }}>
                  {selectedCase.finalDiagnosis}
                </p>
              </div>

              {/* Key Learning Points */}
              <div
                className="rounded-2xl p-6 border"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                  <IconStar size={18} style={{ color: 'var(--warning)' }} />
                  关键学习要点
                </h3>
                <ul className="space-y-2">
                  {selectedCase.keyLearningPoints.map((pt, i) => (
                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--fg)' }}>
                      <span
                        className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2"
                        style={{ background: 'var(--accent)' }}
                      />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Expert Commentary */}
              <div
                className="rounded-2xl p-6 border"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                  <IconBookOpen size={18} style={{ color: 'var(--accent)' }} />
                  专家点评
                </h3>
                <p className="text-sm leading-relaxed italic" style={{ color: 'var(--fg-muted)' }}>
                  {selectedCase.expertCommentary}
                </p>
              </div>

              {/* Related Links */}
              <div
                className="rounded-2xl p-6 border"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <h3 className="font-bold mb-3" style={{ color: 'var(--fg)' }}>
                  相关资源
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                    相关疾病：
                  </span>
                  {selectedCase.relatedDiseaseIds.map((did) => (
                    <Link
                      key={did}
                      href={`/atlas/${selectedCase.organ}/${did}`}
                      className="text-xs px-2 py-1 rounded-lg border transition-colors"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--accent)',
                        textDecoration: 'none',
                      }}
                    >
                      {did}
                    </Link>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                    相关标记物：
                  </span>
                  {selectedCase.relatedMarkerIds.map((mid) => (
                    <Link
                      key={mid}
                      href={`/markers/${mid}`}
                      className="text-xs px-2 py-1 rounded-lg border transition-colors"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--accent)',
                        textDecoration: 'none',
                      }}
                    >
                      {mid.toUpperCase()}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Case List ────────────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <IconMicroscope size={32} style={{ color: 'var(--accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--fg)' }}>
              虚拟病例
            </h1>
            <span
              className="text-sm px-2.5 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}
            >
              {filtered.length} 例
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            通过互动式病例练习，锻炼诊断思维和免疫组化选择能力
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Difficulty filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
              难度：
            </span>
            {[
              { key: 'all', label: '全部' },
              { key: 'easy', label: '简单' },
              { key: 'medium', label: '中等' },
              { key: 'hard', label: '困难' },
            ].map((d) => (
              <button
                key={d.key}
                onClick={() => setDifficultyFilter(d.key)}
                className="text-xs px-3 py-1.5 rounded-full border transition-all font-medium"
                style={{
                  background:
                    difficultyFilter === d.key ? 'var(--accent)' : 'var(--card)',
                  color: difficultyFilter === d.key ? '#fff' : 'var(--fg-muted)',
                  borderColor:
                    difficultyFilter === d.key ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Organ filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
              器官：
            </span>
            <button
              onClick={() => setOrganFilter('all')}
              className="text-xs px-3 py-1.5 rounded-full border transition-all font-medium"
              style={{
                background: organFilter === 'all' ? 'var(--accent)' : 'var(--card)',
                color: organFilter === 'all' ? '#fff' : 'var(--fg-muted)',
                borderColor: organFilter === 'all' ? 'var(--accent)' : 'var(--border)',
              }}
            >
              全部
            </button>
            {organs.map((o) => (
              <button
                key={o}
                onClick={() => setOrganFilter(o)}
                className="text-xs px-3 py-1.5 rounded-full border transition-all font-medium"
                style={{
                  background: organFilter === o ? 'var(--accent)' : 'var(--card)',
                  color: organFilter === o ? '#fff' : 'var(--fg-muted)',
                  borderColor: organFilter === o ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {ORGAN_LABELS[o] ?? o}
              </button>
            ))}
          </div>
        </div>

        {/* Case Cards Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--fg-muted)' }}>
            没有匹配的病例
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => {
              const dm = DIFFICULTY_META[c.difficulty];
              return (
                <button
                  key={c.id}
                  onClick={() => openCase(c.id)}
                  className="text-left rounded-2xl p-5 border transition-all hover:shadow-lg group"
                  style={{
                    background: 'var(--card)',
                    borderColor: 'var(--border)',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--card-hover)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'var(--card)')
                  }
                >
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ color: dm.color, background: dm.bg }}
                    >
                      {dm.label}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--fg-muted)',
                      }}
                    >
                      {ORGAN_LABELS[c.organ] ?? c.organ}
                    </span>
                  </div>

                  <h3
                    className="font-bold mb-2 text-sm leading-snug"
                    style={{ color: 'var(--fg)' }}
                  >
                    {c.titleZh}
                  </h3>

                  <p
                    className="text-xs leading-relaxed mb-3"
                    style={{
                      color: 'var(--fg-muted)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {c.clinicalHistory}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                      {c.steps.length} 个步骤
                    </span>
                    <span
                      className="flex items-center gap-1 text-xs transition-colors"
                      style={{ color: 'var(--accent)' }}
                    >
                      开始练习
                      <IconChevronRight size={14} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Section helper ─────────────────────────────────────────── */

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-5 border mb-5"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <h2
        className="font-bold mb-3 flex items-center gap-2 text-sm"
        style={{ color: 'var(--fg)' }}
      >
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}
