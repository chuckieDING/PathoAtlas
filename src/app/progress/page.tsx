'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useProgress } from '@/components/useProgress';
import { StreakWidget, LevelBadge, DailyGoalWidget, MasteryDots } from '@/components/ProgressWidgets';
import { ACHIEVEMENTS, getTodayXP, getLevelProgress, setDailyGoal, resetProgress } from '@/lib/progress';
import { IconTrophy, IconFlame, IconZap, IconTarget, IconCheckCircle, IconLock, IconActivity, IconBookOpen, IconStar } from '@/components/Icon';

export default function ProgressPage() {
  const state = useProgress();
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('50');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!state) {
    return <div className="flex items-center justify-center h-96"><div className="animate-pulse" style={{ color: 'var(--fg-muted)' }}>加载中...</div></div>;
  }

  const levelInfo = getLevelProgress(state.totalXP);
  const todayXP = getTodayXP(state);
  const unlockedIds = new Set(state.achievements.map(a => a.id));
  const unlockedCount = unlockedIds.size;
  const accuracy = state.totalCardsReviewed > 0
    ? Math.round((state.totalCorrect / state.totalCardsReviewed) * 100)
    : 0;

  // Mastery breakdown
  const masteryLevels = [0, 0, 0, 0, 0, 0]; // index = mastery level (0-5)
  Object.values(state.diseaseMastery).forEach(m => masteryLevels[m.mastery]++);
  const totalDiseases = 48; // from data audit
  const notStudied = totalDiseases - Object.keys(state.diseaseMastery).length;

  // Last 7 days XP chart
  const last7Days: { date: string; xp: number; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const entry = state.dailyXPHistory.find(e => e.date === dateStr);
    const weekday = ['日','一','二','三','四','五','六'][d.getDay()];
    last7Days.push({ date: dateStr, xp: entry?.xp || 0, label: weekday });
  }
  const maxXP = Math.max(...last7Days.map(d => d.xp), state.dailyGoal);

  const handleSetGoal = () => {
    const n = parseInt(goalInput, 10);
    if (!isNaN(n) && n > 0 && n <= 1000) {
      setDailyGoal(n);
      setEditingGoal(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
        <Link href="/" style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}>首页</Link>
        <span>/</span>
        <span style={{ color: 'var(--fg)' }}>学习进度</span>
      </div>

      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--fg)' }}>我的学习进度</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>记录你的每一次学习，见证成长</p>

      {/* Top stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StreakWidget />
        <LevelBadge />
        <DailyGoalWidget />
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { Icon: IconBookOpen, label: '已学疾病', value: state.totalDiseasesStudied, color: '#6366f1' },
          { Icon: IconActivity, label: '已复习卡片', value: state.totalCardsReviewed, color: '#22c55e' },
          { Icon: IconTarget, label: '答题正确率', value: accuracy + '%', color: '#f59e0b' },
          { Icon: IconFlame, label: '最长连击', value: state.maxStreak + '天', color: '#ef4444' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <s.Icon size={18} style={{ color: s.color }} />
            <div className="text-xl font-bold tabular-nums mt-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 7 day XP chart */}
      <div className="rounded-xl p-5 border mb-8" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          <IconZap size={16} style={{ color: 'var(--accent)' }} />
          <span>最近7天学习量</span>
        </h2>
        <div className="flex items-end gap-2 sm:gap-3 h-32">
          {last7Days.map((d, i) => {
            const height = maxXP > 0 ? (d.xp / maxXP) * 100 : 0;
            const isToday = i === last7Days.length - 1;
            const metGoal = d.xp >= state.dailyGoal;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs tabular-nums" style={{ color: 'var(--fg-muted)' }}>{d.xp}</div>
                <div className="w-full rounded-t" style={{
                  height: `${Math.max(height, 2)}%`,
                  background: metGoal ? '#22c55e' : (isToday ? 'var(--accent)' : 'var(--border)'),
                  minHeight: 4,
                }} />
                <div className="text-xs" style={{ color: isToday ? 'var(--accent)' : 'var(--fg-muted)', fontWeight: isToday ? 700 : 400 }}>
                  {d.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily goal setting */}
      <div className="rounded-xl p-5 border mb-8" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          <IconTarget size={16} style={{ color: '#f59e0b' }} />
          <span>每日目标</span>
        </h2>
        {editingGoal ? (
          <div className="flex items-center gap-2">
            <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)} min="10" max="1000"
              className="w-24 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
            <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>XP/天</span>
            <button onClick={handleSetGoal} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>保存</button>
            <button onClick={() => setEditingGoal(false)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--fg-muted)' }}>取消</button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="text-sm" style={{ color: 'var(--fg)' }}>每天学习 <span className="font-bold text-lg tabular-nums">{state.dailyGoal}</span> XP</div>
            <button onClick={() => { setGoalInput(String(state.dailyGoal)); setEditingGoal(true); }}
              className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}>修改</button>
          </div>
        )}
      </div>

      {/* Mastery breakdown */}
      <div className="rounded-xl p-5 border mb-8" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          <IconStar size={16} style={{ color: '#f59e0b' }} />
          <span>疾病掌握度分布</span>
        </h2>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map(lvl => {
            const count = masteryLevels[lvl];
            const percent = totalDiseases > 0 ? (count / totalDiseases) * 100 : 0;
            const colors = ['', '#94a3b8', '#60a5fa', '#fbbf24', '#f97316', '#22c55e'];
            return (
              <div key={lvl} className="flex items-center gap-3">
                <div className="w-14 flex justify-end"><MasteryDots level={lvl} /></div>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: colors[lvl] }} />
                </div>
                <div className="w-12 text-right text-xs tabular-nums" style={{ color: 'var(--fg-muted)' }}>{count} 种</div>
              </div>
            );
          })}
          <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="w-14 text-right text-xs" style={{ color: 'var(--fg-muted)' }}>未学</div>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full" style={{ width: `${(notStudied / totalDiseases) * 100}%`, background: 'var(--fg-muted)', opacity: 0.3 }} />
            </div>
            <div className="w-12 text-right text-xs tabular-nums" style={{ color: 'var(--fg-muted)' }}>{notStudied} 种</div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="rounded-xl p-5 border mb-8" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 className="font-semibold text-sm mb-4 flex items-center justify-between" style={{ color: 'var(--fg)' }}>
          <span className="flex items-center gap-2">
            <IconTrophy size={16} style={{ color: '#f59e0b' }} />
            <span>成就徽章</span>
          </span>
          <span className="text-xs font-normal tabular-nums" style={{ color: 'var(--fg-muted)' }}>
            {unlockedCount} / {ACHIEVEMENTS.length}
          </span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ACHIEVEMENTS.map(a => {
            const unlocked = unlockedIds.has(a.id);
            return (
              <div key={a.id} className="rounded-xl p-3 border flex items-center gap-3" style={{
                background: unlocked ? 'var(--card-hover)' : 'var(--bg)',
                borderColor: unlocked ? 'var(--accent)' : 'var(--border)',
                opacity: unlocked ? 1 : 0.5,
              }}>
                <div className="text-2xl flex-shrink-0">
                  {unlocked ? a.icon : <IconLock size={20} />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate" style={{ color: unlocked ? 'var(--fg)' : 'var(--fg-muted)' }}>
                    {a.titleZh}
                  </div>
                  <div className="text-xs leading-tight" style={{ color: 'var(--fg-muted)' }}>{a.descZh}</div>
                </div>
                {unlocked && <IconCheckCircle size={14} style={{ color: '#22c55e', flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset button */}
      <div className="text-center pb-8">
        {showResetConfirm ? (
          <div className="inline-flex items-center gap-2 rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span className="text-xs" style={{ color: '#ef4444' }}>确认重置所有学习进度？此操作不可恢复。</span>
            <button onClick={() => { resetProgress(); setShowResetConfirm(false); }}
              className="px-3 py-1 rounded-lg text-xs font-medium" style={{ background: '#ef4444', color: '#fff' }}>
              确认重置
            </button>
            <button onClick={() => setShowResetConfirm(false)} className="text-xs px-2" style={{ color: 'var(--fg-muted)' }}>取消</button>
          </div>
        ) : (
          <button onClick={() => setShowResetConfirm(true)} className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            重置学习进度
          </button>
        )}
      </div>
    </div>
  );
}
