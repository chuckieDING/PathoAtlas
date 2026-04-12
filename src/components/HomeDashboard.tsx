'use client';

import { useProgress } from './useProgress';
import { StreakWidget, LevelBadge, DailyGoalWidget } from './ProgressWidgets';
import Link from 'next/link';
import { IconTrophy, IconArrowRight } from './Icon';

export function HomeDashboard() {
  const state = useProgress();
  if (!state) return null;

  // Don't show dashboard for brand new users - show a welcome CTA instead
  if (state.totalXP === 0 && state.totalDiseasesStudied === 0) {
    return (
      <div className="rounded-2xl p-6 mb-8 border text-center" style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(34,197,94,0.08))',
        borderColor: 'var(--border)',
      }}>
        <div className="text-lg font-bold mb-2" style={{ color: 'var(--fg)' }}>开始你的病理学习之旅</div>
        <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
          打开任意疾病开始学习，系统会自动记录你的学习进度、连续学习天数和掌握度。
        </p>
        <Link href="/atlas" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}>
          浏览病理图谱 <IconArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>我的学习进度</h2>
        <Link href="/progress" className="text-xs flex items-center gap-1 transition-colors" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          查看全部 <IconArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StreakWidget />
        <LevelBadge />
        <DailyGoalWidget />
      </div>

      {state.achievements.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
          <IconTrophy size={14} />
          <span>已解锁 {state.achievements.length} 个成就</span>
        </div>
      )}
    </div>
  );
}
