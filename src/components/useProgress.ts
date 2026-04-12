'use client';

import { useEffect, useState } from 'react';
import { loadProgress, ProgressState } from '@/lib/progress';

/** React hook that subscribes to progress updates via localStorage events */
export function useProgress(): ProgressState | null {
  const [state, setState] = useState<ProgressState | null>(null);

  useEffect(() => {
    setState(loadProgress());

    const handleUpdate = () => setState(loadProgress());
    window.addEventListener('pathoatlas:progress-update', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('pathoatlas:progress-update', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return state;
}
