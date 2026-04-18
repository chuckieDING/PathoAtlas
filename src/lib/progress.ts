// Duolingo-style gamification + learning progress system
// Data persisted to server via /api/user/progress.
// In-memory cache keeps the synchronous API surface unchanged.

'use client';

export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface DiseaseMastery {
  id: string;
  mastery: MasteryLevel;  // 0 = 未学习, 1-5 = 掌握度递增
  lastStudied: string;    // ISO date
  studyCount: number;
  correctCount: number;
  wrongCount: number;
}

export interface MarkerMastery {
  id: string;
  mastery: MasteryLevel;
  lastStudied: string;
  studyCount: number;
}

export interface DailyXP {
  date: string;      // YYYY-MM-DD
  xp: number;
}

export interface Achievement {
  id: string;
  unlockedAt: string;
}

export interface ProgressState {
  // Streak tracking
  currentStreak: number;
  maxStreak: number;
  lastStudyDate: string;    // YYYY-MM-DD

  // XP & Level
  totalXP: number;
  dailyGoal: number;        // target XP per day

  // Daily XP history (last 30 days)
  dailyXPHistory: DailyXP[];

  // Mastery tracking
  diseaseMastery: Record<string, DiseaseMastery>;
  markerMastery: Record<string, MarkerMastery>;

  // Achievements
  achievements: Achievement[];

  // Stats
  totalDiseasesStudied: number;
  totalCardsReviewed: number;
  totalCorrect: number;
  totalWrong: number;

  // Onboarding
  guideCompleted?: boolean;

  createdAt: string;
}

// ── XP System ─────────────────────────────────────────────
export const XP_REWARDS = {
  FIRST_STUDY: 10,        // 第一次学习一种疾病
  REVIEW_DISEASE: 5,      // 重新查看已学疾病
  CORRECT_CARD: 8,        // 复习卡片答对
  WRONG_CARD: 2,          // 复习卡片答错(依然给少量奖励)
  COMPLETE_QUIZ: 15,      // 完成一轮测验
  DAILY_GOAL_MET: 20,     // 达成每日目标
  STREAK_MILESTONE: 30,   // 连击里程碑奖励
} as const;

// Level thresholds (cumulative XP)
const LEVEL_THRESHOLDS = [
  0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250,
  2750, 3300, 3900, 4550, 5250, 6000, 6800, 7650, 8550, 9500,
  10500, 11550, 12650, 13800, 15000, 16250, 17550, 18900, 20300, 21750,
];

export function getLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getLevelProgress(xp: number): { level: number; current: number; needed: number; percent: number } {
  const level = getLevel(xp);
  const levelStart = LEVEL_THRESHOLDS[level - 1] || 0;
  const levelEnd = LEVEL_THRESHOLDS[level] || levelStart + 1000;
  const current = xp - levelStart;
  const needed = levelEnd - levelStart;
  return { level, current, needed, percent: Math.min(100, (current / needed) * 100) };
}

// ── Date Utils ────────────────────────────────────────────
function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.round((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000));
}

// ── Default State ─────────────────────────────────────────
function createDefaultState(): ProgressState {
  return {
    currentStreak: 0,
    maxStreak: 0,
    lastStudyDate: '',
    totalXP: 0,
    dailyGoal: 50,
    dailyXPHistory: [],
    diseaseMastery: {},
    markerMastery: {},
    achievements: [],
    totalDiseasesStudied: 0,
    totalCardsReviewed: 0,
    totalCorrect: 0,
    totalWrong: 0,
    createdAt: new Date().toISOString(),
  };
}

// ── Storage (in-memory cache + debounced server sync) ────

let cachedState: ProgressState | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function loadProgress(): ProgressState {
  if (cachedState) return cachedState;
  return createDefaultState();
}

export function saveProgress(state: ProgressState): void {
  cachedState = state;
  if (typeof window === 'undefined') return;
  // Notify components immediately
  window.dispatchEvent(new CustomEvent('pathoatlas:progress-update'));
  // Debounced server write (500ms)
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch('/api/user/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }).catch(() => { /* network error — will retry on next save */ });
  }, 500);
}

/** Hydrate the in-memory cache from the server. Call once on app mount. */
export async function initProgress(): Promise<ProgressState> {
  if (typeof window === 'undefined') return createDefaultState();
  try {
    const res = await fetch('/api/user/progress');
    if (res.ok) {
      const data = await res.json();
      cachedState = { ...createDefaultState(), ...data };
    } else {
      cachedState = createDefaultState();
    }
  } catch {
    cachedState = createDefaultState();
  }
  window.dispatchEvent(new CustomEvent('pathoatlas:progress-update'));
  return cachedState!;
}

// ── Streak Updates ─────────────────────────────────────────
function updateStreak(state: ProgressState): ProgressState {
  const now = today();
  if (state.lastStudyDate === now) return state;  // already studied today
  const diff = state.lastStudyDate ? daysBetween(state.lastStudyDate, now) : 0;
  let newStreak = state.currentStreak;
  if (!state.lastStudyDate || diff === 1) {
    newStreak = state.currentStreak + 1;
  } else if (diff > 1) {
    newStreak = 1;  // streak broken, restart
  }
  return {
    ...state,
    currentStreak: newStreak,
    maxStreak: Math.max(state.maxStreak, newStreak),
    lastStudyDate: now,
  };
}

// ── Daily XP Tracking ─────────────────────────────────────
function addDailyXP(state: ProgressState, amount: number): ProgressState {
  const now = today();
  const history = [...state.dailyXPHistory];
  const todayEntry = history.find(e => e.date === now);
  if (todayEntry) {
    todayEntry.xp += amount;
  } else {
    history.unshift({ date: now, xp: amount });
    // keep last 30 days
    if (history.length > 30) history.pop();
  }
  return { ...state, dailyXPHistory: history };
}

export function getTodayXP(state: ProgressState): number {
  const now = today();
  return state.dailyXPHistory.find(e => e.date === now)?.xp || 0;
}

// ── Public Actions ────────────────────────────────────────

/** Called when user opens a disease detail page */
export function recordDiseaseStudy(diseaseId: string): ProgressState {
  let state = loadProgress();
  state = updateStreak(state);

  const existing = state.diseaseMastery[diseaseId];
  const isFirstTime = !existing;
  const xpGained = isFirstTime ? XP_REWARDS.FIRST_STUDY : XP_REWARDS.REVIEW_DISEASE;

  state = {
    ...state,
    totalXP: state.totalXP + xpGained,
    totalDiseasesStudied: isFirstTime ? state.totalDiseasesStudied + 1 : state.totalDiseasesStudied,
    diseaseMastery: {
      ...state.diseaseMastery,
      [diseaseId]: {
        id: diseaseId,
        mastery: isFirstTime ? 1 : (existing!.mastery),
        lastStudied: new Date().toISOString(),
        studyCount: (existing?.studyCount || 0) + 1,
        correctCount: existing?.correctCount || 0,
        wrongCount: existing?.wrongCount || 0,
      },
    },
  };

  state = addDailyXP(state, xpGained);
  state = checkAchievements(state);
  saveProgress(state);
  return state;
}

/** Called when user completes a review card */
export function recordCardReview(sourceId: string, correct: boolean): ProgressState {
  let state = loadProgress();
  state = updateStreak(state);

  const xpGained = correct ? XP_REWARDS.CORRECT_CARD : XP_REWARDS.WRONG_CARD;
  state = {
    ...state,
    totalXP: state.totalXP + xpGained,
    totalCardsReviewed: state.totalCardsReviewed + 1,
    totalCorrect: state.totalCorrect + (correct ? 1 : 0),
    totalWrong: state.totalWrong + (correct ? 0 : 1),
  };

  // Update disease mastery if it's a disease card
  if (state.diseaseMastery[sourceId]) {
    const existing = state.diseaseMastery[sourceId];
    const newMastery: MasteryLevel = correct
      ? (Math.min(5, existing.mastery + 1) as MasteryLevel)
      : (Math.max(1, existing.mastery - 1) as MasteryLevel);
    state.diseaseMastery = {
      ...state.diseaseMastery,
      [sourceId]: {
        ...existing,
        mastery: newMastery,
        lastStudied: new Date().toISOString(),
        correctCount: existing.correctCount + (correct ? 1 : 0),
        wrongCount: existing.wrongCount + (correct ? 0 : 1),
      },
    };
  }

  state = addDailyXP(state, xpGained);
  state = checkAchievements(state);
  saveProgress(state);
  return state;
}

/** Called when user completes a full quiz session */
export function recordQuizComplete(correct: number, total: number): ProgressState {
  let state = loadProgress();
  state = updateStreak(state);
  state = {
    ...state,
    totalXP: state.totalXP + XP_REWARDS.COMPLETE_QUIZ,
  };
  state = addDailyXP(state, XP_REWARDS.COMPLETE_QUIZ);

  // Check daily goal met
  const todayXP = getTodayXP(state);
  if (todayXP >= state.dailyGoal && todayXP - XP_REWARDS.COMPLETE_QUIZ < state.dailyGoal) {
    // just met goal
    state = { ...state, totalXP: state.totalXP + XP_REWARDS.DAILY_GOAL_MET };
    state = addDailyXP(state, XP_REWARDS.DAILY_GOAL_MET);
  }

  state = checkAchievements(state);
  saveProgress(state);
  return state;
}

export function setDailyGoal(goal: number): ProgressState {
  const state = loadProgress();
  const updated = { ...state, dailyGoal: goal };
  saveProgress(updated);
  return updated;
}

export function resetProgress(): ProgressState {
  const fresh = createDefaultState();
  saveProgress(fresh);
  return fresh;
}

// ── Achievements ──────────────────────────────────────────
export interface AchievementDef {
  id: string;
  titleZh: string;
  descZh: string;
  icon: string;      // single character/emoji for badge
  check: (state: ProgressState) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-study', titleZh: '初窥门径', descZh: '学习第一种疾病', icon: '🎯',
    check: s => s.totalDiseasesStudied >= 1 },
  { id: 'study-10', titleZh: '勤勉学子', descZh: '累计学习10种疾病', icon: '📚',
    check: s => s.totalDiseasesStudied >= 10 },
  { id: 'study-25', titleZh: '博学多识', descZh: '累计学习25种疾病', icon: '🧠',
    check: s => s.totalDiseasesStudied >= 25 },
  { id: 'study-all', titleZh: '通晓百病', descZh: '学习所有疾病', icon: '👑',
    check: s => s.totalDiseasesStudied >= 48 },
  { id: 'streak-3', titleZh: '三日不辍', descZh: '连续学习3天', icon: '🔥',
    check: s => s.currentStreak >= 3 || s.maxStreak >= 3 },
  { id: 'streak-7', titleZh: '周而不息', descZh: '连续学习7天', icon: '🔥',
    check: s => s.currentStreak >= 7 || s.maxStreak >= 7 },
  { id: 'streak-30', titleZh: '百炼成钢', descZh: '连续学习30天', icon: '⚔️',
    check: s => s.currentStreak >= 30 || s.maxStreak >= 30 },
  { id: 'xp-100', titleZh: '初出茅庐', descZh: '累计获得100 XP', icon: '⭐',
    check: s => s.totalXP >= 100 },
  { id: 'xp-1000', titleZh: '学有所成', descZh: '累计获得1000 XP', icon: '🌟',
    check: s => s.totalXP >= 1000 },
  { id: 'xp-5000', titleZh: '学富五车', descZh: '累计获得5000 XP', icon: '💫',
    check: s => s.totalXP >= 5000 },
  { id: 'quiz-50', titleZh: '测验达人', descZh: '完成50张复习卡片', icon: '📝',
    check: s => s.totalCardsReviewed >= 50 },
  { id: 'accuracy-80', titleZh: '精准医师', descZh: '正确率达到80%(至少20题)', icon: '🎯',
    check: s => s.totalCardsReviewed >= 20 && s.totalCorrect / s.totalCardsReviewed >= 0.8 },
  { id: 'level-5', titleZh: '进阶学者', descZh: '达到 5 级', icon: '🎓',
    check: s => getLevel(s.totalXP) >= 5 },
  { id: 'level-10', titleZh: '资深医师', descZh: '达到 10 级', icon: '🏆',
    check: s => getLevel(s.totalXP) >= 10 },
  { id: 'mastery-1', titleZh: '精通一门', descZh: '有疾病达到最高掌握度(5级)', icon: '💎',
    check: s => Object.values(s.diseaseMastery).some(m => m.mastery >= 5) },
];

function checkAchievements(state: ProgressState): ProgressState {
  const unlockedIds = new Set(state.achievements.map(a => a.id));
  const newly: Achievement[] = [];
  for (const def of ACHIEVEMENTS) {
    if (!unlockedIds.has(def.id) && def.check(state)) {
      newly.push({ id: def.id, unlockedAt: new Date().toISOString() });
    }
  }
  if (newly.length === 0) return state;
  return { ...state, achievements: [...state.achievements, ...newly] };
}

export function isAchievementUnlocked(state: ProgressState, id: string): boolean {
  return state.achievements.some(a => a.id === id);
}
