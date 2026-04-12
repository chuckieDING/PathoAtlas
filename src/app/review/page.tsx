'use client';

import { useEffect, useState, useCallback } from 'react';
import { recordCardReview, recordQuizComplete } from '@/lib/progress';
import { IconZap, IconBrain } from '@/components/Icon';

interface Disease {
  id: string; nameZh: string; nameEn: string; organ: string; category: string;
  keyFeatures: string[]; microscopy: string; ihcProfile: { marker: string; result: string; note: string }[];
  differentialDiagnosis: string[]; epidemiology: string;
}

interface Marker {
  id: string; nameZh: string; nameEn: string; abbreviation: string;
  function: string; interpretation: string; clinicalSignificance: string;
  positiveIn: string[]; cellularLocalization: string;
}

type Card = {
  type: 'disease-feature' | 'disease-ihc' | 'marker-function' | 'marker-location';
  question: string;
  answer: string;
  source: string;
  sourceId: string;  // disease id or marker id (for mastery tracking)
};

type Mode = 'setup' | 'quiz' | 'result';

export default function ReviewPage() {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('setup');
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [cardCount, setCardCount] = useState(10);

  useEffect(() => {
    Promise.all([
      fetch('/api/all-diseases').then(r => r.json()),
      fetch('/api/markers').then(r => r.json()),
    ]).then(([d, m]) => {
      setDiseases(Array.isArray(d) ? d : []);
      setMarkers(Array.isArray(m) ? m : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const generateCards = useCallback(() => {
    const pool: Card[] = [];

    for (const d of diseases) {
      if (d.keyFeatures.length > 0) {
        pool.push({ type: 'disease-feature', question: `"${d.nameZh}" 的诊断要点是什么？`, answer: d.keyFeatures.join('；'), source: d.nameZh, sourceId: d.id });
      }
      if (d.ihcProfile.length > 0) {
        const profile = d.ihcProfile.map(m => `${m.marker}: ${m.result}`).join('、');
        pool.push({ type: 'disease-ihc', question: `"${d.nameZh}" 的典型免疫组化表型？`, answer: profile, source: d.nameZh, sourceId: d.id });
      }
      if (d.microscopy) {
        pool.push({ type: 'disease-feature', question: `描述 "${d.nameZh}" 的镜下特征`, answer: d.microscopy, source: d.nameZh, sourceId: d.id });
      }
    }

    for (const m of markers) {
      if (m.function) {
        pool.push({ type: 'marker-function', question: `${m.abbreviation || m.nameEn} 的功能和临床意义？`, answer: `${m.function}。${m.clinicalSignificance}`, source: m.nameZh, sourceId: m.id });
      }
      if (m.cellularLocalization) {
        pool.push({ type: 'marker-location', question: `${m.abbreviation || m.nameEn} 的阳性定位部位？`, answer: m.cellularLocalization, source: m.nameZh, sourceId: m.id });
      }
      if (m.positiveIn.length > 0) {
        pool.push({ type: 'marker-function', question: `哪些肿瘤/疾病中 ${m.abbreviation || m.nameEn} 呈阳性表达？`, answer: m.positiveIn.join('、'), source: m.nameZh, sourceId: m.id });
      }
    }

    // Shuffle and take N
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, cardCount);
  }, [diseases, markers, cardCount]);

  const startQuiz = () => {
    const c = generateCards();
    setCards(c);
    setCurrentIdx(0);
    setShowAnswer(false);
    setScore({ correct: 0, wrong: 0 });
    setMode('quiz');
  };

  const handleAnswer = (correct: boolean) => {
    // Record XP + mastery update
    const currentCard = cards[currentIdx];
    if (currentCard) {
      recordCardReview(currentCard.sourceId, correct);
    }
    const newScore = correct
      ? { correct: score.correct + 1, wrong: score.wrong }
      : { correct: score.correct, wrong: score.wrong + 1 };
    setScore(newScore);
    if (currentIdx + 1 >= cards.length) {
      // Quiz complete
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

          <div className="mb-6">
            <label className="text-sm mb-2 block" style={{ color: 'var(--fg-muted)' }}>题目数量</label>
            <div className="flex gap-2 justify-center">
              {[5, 10, 20, 30].map(n => (
                <button key={n} onClick={() => setCardCount(n)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: cardCount === n ? 'var(--accent)' : 'var(--card-hover)', color: cardCount === n ? '#fff' : 'var(--fg-muted)' }}>
                  {n} 题
                </button>
              ))}
            </div>
          </div>

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
              <div className="text-xs mb-4 px-2 py-0.5 rounded-full inline-block" style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}>
                {card.source}
              </div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--fg)' }}>{card.question}</h3>
            </div>

            {showAnswer ? (
              <div>
                <div className="rounded-xl p-4 mb-6" style={{ background: 'var(--card-hover)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>{card.answer}</p>
                </div>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => handleAnswer(false)} className="px-6 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                    不记得
                  </button>
                  <button onClick={() => handleAnswer(true)} className="px-6 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
                    记住了
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAnswer(true)} className="w-full py-3 rounded-xl text-sm font-medium transition-all hover:shadow-md"
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
          <button onClick={() => { setMode('setup'); }} className="px-8 py-3 rounded-xl text-sm font-semibold transition-all hover:shadow-lg"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            再来一轮
          </button>
        </div>
      )}
    </div>
  );
}
