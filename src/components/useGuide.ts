'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadProgress, saveProgress } from '@/lib/progress';
import { useProgress } from './useProgress';

/** Global event name for triggering the guide from anywhere (e.g. Navbar) */
export const GUIDE_START_EVENT = 'pathoatlas:start-guide';

/**
 * Hook for the feature guide system.
 * Tracks whether the user has completed the onboarding guide.
 */
export function useGuide() {
  const progress = useProgress();
  const [forceShow, setForceShow] = useState(false);

  /** Whether the guide should be shown (first visit or manually triggered) */
  const shouldShow = forceShow || (progress !== null && !progress.guideCompleted);

  /** Mark guide as completed */
  const completeGuide = useCallback(() => {
    setForceShow(false);
    const state = loadProgress();
    saveProgress({ ...state, guideCompleted: true });
  }, []);

  /** Manually restart the guide */
  const startGuide = useCallback(() => {
    setForceShow(true);
  }, []);

  /** Skip = same as complete (don't show again) */
  const skipGuide = useCallback(() => {
    completeGuide();
  }, [completeGuide]);

  // Listen for global start-guide events (from Navbar etc.)
  useEffect(() => {
    const handler = () => setForceShow(true);
    window.addEventListener(GUIDE_START_EVENT, handler);
    return () => window.removeEventListener(GUIDE_START_EVENT, handler);
  }, []);

  return { shouldShow, completeGuide, skipGuide, startGuide };
}
