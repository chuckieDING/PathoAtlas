'use client';

import { useProgress } from './useProgress';
import { getLevelProgress, getTodayXP } from '@/lib/progress';
import { IconFlame, IconStar, IconZap, IconTarget } from './Icon';

// ── Streak Widget (flame icon + streak count) ─────────────
export function StreakWidget({ compact = false }: { compact?: boolean }) {
  const state = useProgress();
  if (!state) return null;

  const isActive = state.currentStreak > 0;
  const color = isActive ? '#f97316' : 'var(--fg-muted)';

  if (compact) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: isActive ? 'rgba(249,115,22,0.1)' : 'transparent', color }}>
        <IconFlame size={16} />
        <span className="text-xs font-bold tabular-nums">{state.currentStreak}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl p-3 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="rounded-lg p-2" style={{ background: color + '18', color }}>
        <IconFlame size={20} />
      </div>
      <div>
        <div className="text-xl font-bold tabular-nums" style={{ color }}>{state.currentStreak}</div>
        <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>连击天数</div>
      </div>
    </div>
  );
}

// ── Level Badge (Lv X) ────────────────────────────────────
export function LevelBadge({ compact = false }: { compact?: boolean }) {
  const state = useProgress();
  if (!state) return null;

  const { level, current, needed, percent } = getLevelProgress(state.totalXP);

  if (compact) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}>
        <IconStar size={14} />
        <span className="text-xs font-bold tabular-nums">Lv{level}</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-3 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2" style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent)' }}>
            <IconStar size={18} />
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>当前等级</div>
            <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--accent)' }}>Lv {level}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>总 XP</div>
          <div className="text-sm font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{state.totalXP}</div>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: 'var(--accent)' }} />
      </div>
      <div className="text-xs mt-1 tabular-nums" style={{ color: 'var(--fg-muted)' }}>
        {current} / {needed} XP 到下一级
      </div>
    </div>
  );
}

// ── Daily Goal Progress ───────────────────────────────────
export function DailyGoalWidget() {
  const state = useProgress();
  if (!state) return null;

  const todayXP = getTodayXP(state);
  const percent = Math.min(100, (todayXP / state.dailyGoal) * 100);
  const isComplete = todayXP >= state.dailyGoal;
  const color = isComplete ? '#22c55e' : '#f59e0b';

  return (
    <div className="rounded-xl p-3 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2" style={{ background: color + '18', color }}>
            <IconTarget size={18} />
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>今日目标</div>
            <div className="text-lg font-bold tabular-nums" style={{ color }}>{todayXP} / {state.dailyGoal}</div>
          </div>
        </div>
        {isComplete && (
          <div className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
            已达成
          </div>
        )}
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Compact Navbar Badges (streak + level combined) ──────
export function NavbarProgress() {
  const state = useProgress();
  if (!state) return null;
  const level = getLevelProgress(state.totalXP).level;

  return (
    <div className="flex items-center gap-1.5">
      {/* Streak */}
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
        style={{ background: state.currentStreak > 0 ? 'rgba(249,115,22,0.1)' : 'transparent',
                 color: state.currentStreak > 0 ? '#f97316' : 'var(--fg-muted)' }}>
        <IconFlame size={14} />
        <span className="text-xs font-bold tabular-nums">{state.currentStreak}</span>
      </div>
      {/* Level (hidden on xs, shown from sm up) */}
      <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg"
        style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}>
        <IconZap size={14} />
        <span className="text-xs font-bold tabular-nums">Lv{level}</span>
      </div>
    </div>
  );
}

// ── Mastery Dots (showing 0-5 filled dots) ────────────────
export function MasteryDots({ level }: { level: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} className="w-1.5 h-1.5 rounded-full" style={{
          background: n <= level ? '#22c55e' : 'var(--border)',
        }} />
      ))}
    </div>
  );
}
