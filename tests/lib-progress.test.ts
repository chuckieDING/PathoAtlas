/**
 * Tests for src/lib/progress.ts — gamification / XP / streak logic.
 *
 * These functions use localStorage (client-side), so we mock it here.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLevel, getLevelProgress, XP_REWARDS, ACHIEVEMENTS,
} from '@/lib/progress';

// ── getLevel ─────────────────────────────────────────────────

describe('getLevel', () => {
  it('returns 1 for 0 XP', () => {
    expect(getLevel(0)).toBe(1);
  });

  it('returns 1 for XP below first threshold', () => {
    expect(getLevel(49)).toBe(1);
  });

  it('returns 2 for 50 XP', () => {
    expect(getLevel(50)).toBe(2);
  });

  it('returns 3 for 150 XP', () => {
    expect(getLevel(150)).toBe(3);
  });

  it('returns max level for very high XP', () => {
    expect(getLevel(100000)).toBe(30);
  });

  it('level increases monotonically', () => {
    let prevLevel = 0;
    for (let xp = 0; xp <= 22000; xp += 50) {
      const level = getLevel(xp);
      expect(level).toBeGreaterThanOrEqual(prevLevel);
      prevLevel = level;
    }
  });
});

// ── getLevelProgress ─────────────────────────────────────────

describe('getLevelProgress', () => {
  it('returns correct structure', () => {
    const p = getLevelProgress(100);
    expect(p).toHaveProperty('level');
    expect(p).toHaveProperty('current');
    expect(p).toHaveProperty('needed');
    expect(p).toHaveProperty('percent');
  });

  it('percent is between 0 and 100', () => {
    for (const xp of [0, 25, 50, 100, 500, 1000, 5000, 20000]) {
      const p = getLevelProgress(xp);
      expect(p.percent).toBeGreaterThanOrEqual(0);
      expect(p.percent).toBeLessThanOrEqual(100);
    }
  });

  it('current + remaining ≈ needed', () => {
    const p = getLevelProgress(200);
    // p.current is XP into current level, p.needed is total for the level
    expect(p.current).toBeLessThanOrEqual(p.needed);
    expect(p.current).toBeGreaterThanOrEqual(0);
  });
});

// ── XP_REWARDS ───────────────────────────────────────────────

describe('XP_REWARDS', () => {
  it('all reward values are positive', () => {
    for (const [key, value] of Object.entries(XP_REWARDS)) {
      expect(value, `${key} should be positive`).toBeGreaterThan(0);
    }
  });

  it('FIRST_STUDY > REVIEW_DISEASE (first-time bonus)', () => {
    expect(XP_REWARDS.FIRST_STUDY).toBeGreaterThan(XP_REWARDS.REVIEW_DISEASE);
  });

  it('CORRECT_CARD > WRONG_CARD', () => {
    expect(XP_REWARDS.CORRECT_CARD).toBeGreaterThan(XP_REWARDS.WRONG_CARD);
  });
});

// ── ACHIEVEMENTS ─────────────────────────────────────────────

describe('ACHIEVEMENTS', () => {
  it('all achievements have required fields', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toBeTruthy();
      expect(a.titleZh).toBeTruthy();
      expect(a.descZh).toBeTruthy();
      expect(a.icon).toBeTruthy();
      expect(typeof a.check).toBe('function');
    }
  });

  it('achievement ids are unique', () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('first-study triggers at totalDiseasesStudied >= 1', () => {
    const firstStudy = ACHIEVEMENTS.find(a => a.id === 'first-study')!;
    expect(firstStudy.check({ totalDiseasesStudied: 0 } as any)).toBe(false);
    expect(firstStudy.check({ totalDiseasesStudied: 1 } as any)).toBe(true);
  });

  it('accuracy-80 requires at least 20 cards', () => {
    const acc = ACHIEVEMENTS.find(a => a.id === 'accuracy-80')!;
    // 19 cards, 100% accuracy — should NOT unlock
    expect(acc.check({ totalCardsReviewed: 19, totalCorrect: 19 } as any)).toBe(false);
    // 20 cards, 80% — should unlock
    expect(acc.check({ totalCardsReviewed: 20, totalCorrect: 16 } as any)).toBe(true);
    // 20 cards, 79% — should NOT unlock
    expect(acc.check({ totalCardsReviewed: 20, totalCorrect: 15 } as any)).toBe(false);
  });
});
