'use client';

import { useEffect, useState } from 'react';
import { loadProgress, initProgress, ProgressState } from '@/lib/progress';

/** React hook that subscribes to progress updates. Hydrates from server on mount. */
export function useProgress(): ProgressState | null {
  const [state, setState] = useState<ProgressState | null>(null);

  useEffect(() => {
    // Hydrate cache from server, then set state
    initProgress().then(() => setState(loadProgress()));

    const handleUpdate = () => setState(loadProgress());
    window.addEventListener('pathoatlas:progress-update', handleUpdate);

    return () => {
      window.removeEventListener('pathoatlas:progress-update', handleUpdate);
    };
  }, []);

  return state;
}
