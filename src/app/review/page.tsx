'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { recordCardReview, recordQuizComplete } from '@/lib/progress';
import { IconZap, IconBrain, IconSearch } from '@/components/Icon';

interface Disease {
  id: string; nameZh: string; nameEn: string; organ: string; category: string;
  keyFeatures: string[]; microscopy: string; ihcProfile: { marker: string; result: string; note: string }[];
  differentialDiagnosis: string[]; epidemiology: string;
}

interface Marker {
  id: string; nameZh: string; nameEn: string; abbreviation: string;
  function: string; interpretation: string; clinicalSignificance: string;
  positiveIn: string[]; cellularLocalization: string;
  organs?: string[];
}

interface Organ { id: string; nameZh: string; color: string }

type Card = {
  type: 'disease-feature' | 'disease-ihc' | 'disease-microscopy' | 'marker-function' | 'marker-location' | 'marker-positive';
  question: string;
  answer: string;
  explanation?: string;
  source: string;
  sourceId: string;
  sourceType: 'disease' | 'marker';
  organ?: string;
  linkUrl: string;
};

type Mode = 'setup' | 'quiz' | 'result';

export default function ReviewPage() {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [organs, setOrgans] = useState<Organ[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('setup');
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [wrongCards, setWrongCards] = useState<Card[]>([]);
  const [cardCount, setCardCount] = useState(10);
  const [organFilter, setOrganFilter] = useState('all');
  const [wrongOnly, setWrongOnly] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/all-diseases').then(r => r.json()),
      fetch('/api/markers').then(r => r.json()),
      fetch('/api/organs').then(r => r.json()),
    ]).then(([d, m, o]) => {
      setDiseases(Array.isArray(d) ? d : []);
      setMarkers(Array.isArray(m) ? m : []);
      setOrgans(Array.isArray(o) ? o : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const generateCards = useCallback(() => {
    const pool: Card[] = [];

    const filteredDiseases = organFilter === 'all' ? diseases : diseases.filter(d => d.organ === organFilter);
    const filteredMarkers = organFilter === 'all' ? markers : markers.filter(m => (m.organs || []).includes(organFilter));

    for (const d of filteredDiseases) {
      const linkUrl = `/atlas/${d.organ}/${d.id}`;
      if (d.keyFeatures.length > 0) {
        pool.push({
          type: 'disease-feature',
          question: `"${d.nameZh}" 的诊断要点是什么？`,
          answer: d.keyFeatures.join('；'),
          explanation: `${d.nameZh}（${d.nameEn}）是${d.category === 'malignant' ? '恶性' : d.category === 'benign' ? '良性' : ''}肿瘤。关键诊断要点需要牢记以在鉴别诊断中快速定位。`,
          source: d.nameZh, sourceId: d.id, sourceType: 'disease', organ: d.organ, linkUrl,
        });
      }
      if (d.ihcProfile.length > 0) {
        const profile = d.ihcProfile.map(m => `${m.marker}: ${m.result}`).join('\n');
        pool.push({
          type: 'disease-ihc',
          question: `"${d.nameZh}" 的典型免疫组化表型？`,
          answer: profile,
          explanation: `免疫组化是鉴别诊断的关键工具。${d.nameZh}的IHC表型可帮助与${d.differentialDiagnosis.slice(0, 2).join('、')}等疾病鉴别。`,
          source: d.nameZh, sourceId: d.id, sourceType: 'disease', organ: d.organ, linkUrl,
        });
      }
      if (d.microscopy && d.microscopy.length > 30) {
        pool.push({
          type: 'disease-microscopy',
          question: `描述 "${d.nameZh}" 的镜下特征`,
          answer: d.microscopy.length > 300 ? d.microscopy.slice(0, 300) + '...' : d.microscopy,
          explanation: `镜下形态是病理诊断的基础。注意观察组织结构、细胞形态和核特征。`,
          source: d.nameZh, sourceId: d.id, sourceType: 'disease', organ: d.organ, linkUrl,
        });
      }
    }

    for (const m of filteredMarkers) {
      const linkUrl = `/markers/${m.id}`;
      if (m.function) {
        pool.push({
          type: 'marker-function',
          question: `${m.abbreviation || m.nameEn} 的功能和临床意义？`,
          answer: `${m.function}。${m.clinicalSignificance}`,
          explanation: `了解标记物的生物学功能有助于理解其在不同肿瘤中的表达模式和临床应用。`,
          source: m.nameZh, sourceId: m.id, sourceType: 'marker', linkUrl,
        });
      }
      if (m.cellularLocalization) {
        pool.push({
          type: 'marker-location',
          question: `${m.abbreviation || m.nameEn} 的阳性定位部位？`,
          answer: m.cellularLocalization,
          explanation: `染色定位（核/膜/浆）是判读IHC的第一步。错误的定位可能导致假阳性判读。`,
          source: m.nameZh, sourceId: m.id, sourceType: 'marker', linkUrl,
        });
      }
      if (m.positiveIn.length > 0) {
        pool.push({
          type: 'marker-positive',
          question: `哪些肿瘤中 ${m.abbreviation || m.nameEn} 呈阳性？`,
          answer: m.positiveIn.join('、'),
          explanation: `掌握标记物的阳性谱系是鉴别诊断的基础。注意区分弥漫阳性与灶性阳性的临床含义。`,
          source: m.nameZh, sourceId: m.id, sourceType: 'marker', linkUrl,
        });
      }
    }

    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, cardCount);
  }, [diseases, markers, cardCount, organFilter]);

  const startQuiz = () => {
    if (wrongOnly && wrongCards.length > 0) {
      setCards(wrongCards.sort(() => Math.random() - 0.5));
    } else {
      setCards(generateCards());
    }
    setCurrentIdx(0);
    setShowAnswer(false);
    setScore({ correct: 0, wrong: 0 });
    if (!wrongOnly) setWrongCards([]);
    setMode('quiz');
  };

  const handleAnswer = (correct: boolean) => {
    const currentCard = cards[currentIdx];
    if (currentCard) {
      recordCardReview(currentCard.sourceId, correct);
      if (!correct) setWrongCards(prev => [...prev, currentCard]);
    }
    const newScore = correct
      ? { correct: score.correct + 1, wrong: score.wrong }
      : { correct: score.correct, wrong: score.wrong + 1 };
    setScore(newScore);
    if (currentIdx + 1 >= cards.length) {
      recordQuizComplete(newScore.correct, cards.length);
      setMode('result');
    } else {
      setCurrentIdx(prev => prev + 1);
      setShowAnswer(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-pulse" style={{ color: 'var(--fg-muted)' }}>加载中...</div></div>;

  const card = cards[currentIdx];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--fg)' }}>复习测验</h1>
      <p className="text-sm mb-8 flex items-center gap-2 flex-wrap" style={{ color: 'var(--fg-muted)' }}>
        <span>闪卡式复习 · 覆盖 {diseases.length} 种疾病和 {markers.length} 个标记物</span>
        <span className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
          <IconZap size={14} /> 答对+8 XP · 答错+2 XP · 完成+15 XP
        </span>
      </p>

      {mode === 'setup' && (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex justify-center mb-4" style={{ color: 'var(--accent)' }}><IconBrain size={48} /></div>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--fg)' }}>开始复习</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>系统将随机抽取知识点生成闪卡，翻转查看答案后自我评估</p>

          {/* Organ filter */}
          <div className="mb-5">
            <label className="text-sm mb-2 block" style={{ color: 'var(--fg-muted)' }}>器官范围</label>
            <div className="flex gap-1.5 flex-wrap justify-center">
              <button
                onClick={() => setOrganFilter('all')}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={{
                  background: organFilter === 'all' ? 'var(--accent)' : 'var(--card-hover)',
                  color: organFilter === 'all' ? '#fff' : 'var(--fg-muted)',
                }}
              >
                全部
              </button>
              {organs.map(o => (
                <button
                  key={o.id}
                  onClick={() => setOrganFilter(o.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                  style={{
                    background: organFilter === o.id ? o.color : 'var(--card-hover)',
                    color: organFilter === o.id ? '#fff' : 'var(--fg-muted)',
                  }}
                >
                  {o.nameZh}
                </button>
              ))}
            </div>
          </div>

          {/* Card count */}
          <div className="mb-5">
            <label className="text-sm mb-2 block" style={{ color: 'var(--fg-muted)' }}>题目数量</label>
            <div className="flex gap-2 justify-center">
              {[5, 10, 20, 30].map(n => (
                <button key={n} onClick={() => { setCardCount(n); setWrongOnly(false); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: cardCount === n && !wrongOnly ? 'var(--accent)' : 'var(--card-hover)', color: cardCount === n && !wrongOnly ? '#fff' : 'var(--fg-muted)' }}>
                  {n} 题
                </button>
              ))}
            </div>
          </div>

          {/* Wrong-only mode */}
          {wrongCards.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setWrongOnly(v => !v)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: wrongOnly ? '#ef4444' : 'var(--card-hover)',
                  color: wrongOnly ? '#fff' : '#ef4444',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}
              >
                仅复习错题 ({wrongCards.length} 题)
              </button>
            </div>
          )}

          <button onClick={startQuiz} className="px-8 py-3 rounded-xl text-sm font-semibold transition-all hover:shadow-lg"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            开始复习
          </button>
        </div>
      )}

      {mode === 'quiz' && card && (
        <div>
          {/* Progress */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>{currentIdx + 1} / {cards.length}</span>
            <div className="flex gap-2 text-xs">
              <span style={{ color: '#22c55e' }}>✓ {score.correct}</span>
              <span style={{ color: '#ef4444' }}>✕ {score.wrong}</span>
            </div>
          </div>
          <div className="h-1 rounded-full mb-6 overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${((currentIdx + 1) / cards.length) * 100}%`, background: 'var(--accent)' }} />
          </div>

          {/* Card */}
          <div className="rounded-2xl p-8 min-h-[300px] flex flex-col justify-between"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}>
                  {card.source}
                </span>
                {card.organ && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}>
                    {card.organ}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--fg)' }}>{card.question}</h3>
            </div>

            {showAnswer ? (
              <div>
                <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-hover)' }}>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--fg)' }}>{card.answer}</p>
                </div>

                {/* Explanation */}
                {card.explanation && (
                  <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--accent)' }}>
                      💡 {card.explanation}
                    </p>
                    <Link href={card.linkUrl} className="text-xs mt-1 inline-flex items-center gap-1" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                      <IconSearch size={10} /> 查看详情
                    </Link>
                  </div>
                )}

                <div className="flex gap-3 justify-center">
                  <button onClick={() => handleAnswer(false)} className="px-6 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                    不记得
                  </button>
                  <button onClick={() => handleAnswer(true)} className="px-6 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                    style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
                    记住了
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAnswer(true)} className="w-full py-3 rounded-xl text-sm font-medium transition-all hover:shadow-md cursor-pointer"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                翻转查看答案
              </button>
            )}
          </div>
        </div>
      )}

      {mode === 'result' && (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="text-5xl mb-4">{score.correct / cards.length >= 0.8 ? '🎉' : score.correct / cards.length >= 0.5 ? '💪' : '📚'}</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--fg)' }}>复习完成</h2>
          <div className="flex gap-8 justify-center my-6">
            <div><div className="text-3xl font-bold" style={{ color: '#22c55e' }}>{score.correct}</div><div className="text-xs" style={{ color: 'var(--fg-muted)' }}>正确</div></div>
            <div><div className="text-3xl font-bold" style={{ color: '#ef4444' }}>{score.wrong}</div><div className="text-xs" style={{ color: 'var(--fg-muted)' }}>需复习</div></div>
            <div><div className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>{Math.round((score.correct / cards.length) * 100)}%</div><div className="text-xs" style={{ color: 'var(--fg-muted)' }}>正确率</div></div>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => { setMode('setup'); setWrongOnly(false); }} className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-lg cursor-pointer"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              再来一轮
            </button>
            {wrongCards.length > 0 && (
              <button onClick={() => { setWrongOnly(true); setMode('setup'); }} className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                复习错题 ({wrongCards.length})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
