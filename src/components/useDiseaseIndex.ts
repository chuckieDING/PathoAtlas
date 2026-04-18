'use client';

import { useEffect, useState } from 'react';

export interface DiseaseIndexEntry {
  id: string;
  nameZh: string;
  nameEn: string;
  organ: string;
}

let cache: Map<string, DiseaseIndexEntry> | null = null;
let pending: Promise<Map<string, DiseaseIndexEntry>> | null = null;

async function fetchIndex(): Promise<Map<string, DiseaseIndexEntry>> {
  if (cache) return cache;
  if (pending) return pending;
  pending = (async () => {
    try {
      const res = await fetch('/api/all-diseases');
      const data = await res.json();
      const map = new Map<string, DiseaseIndexEntry>();
      if (Array.isArray(data)) {
        for (const d of data) {
          map.set(d.id, { id: d.id, nameZh: d.nameZh, nameEn: d.nameEn, organ: d.organ });
        }
      }
      cache = map;
      return map;
    } finally {
      pending = null;
    }
  })();
  return pending;
}

/**
 * Hook for looking up disease info by id. Loads the full disease index once
 * and caches it across all components. Use to resolve disease IDs to names
 * and construct proper /atlas/<organ>/<id> links.
 */
export function useDiseaseIndex() {
  const [index, setIndex] = useState<Map<string, DiseaseIndexEntry> | null>(cache);

  useEffect(() => {
    if (!cache) fetchIndex().then(setIndex);
  }, []);

  /** Resolve disease ID to name. Falls back to the ID if not found. */
  const getName = (id: string): string => {
    const entry = index?.get(id);
    return entry?.nameZh || id;
  };

  /** Build proper URL to the disease detail page. */
  const getHref = (id: string): string => {
    const entry = index?.get(id);
    if (entry) return `/atlas/${entry.organ}/${entry.id}`;
    return `/search?q=${encodeURIComponent(id)}`;
  };

  /** Get full disease entry. */
  const getEntry = (id: string): DiseaseIndexEntry | undefined => {
    return index?.get(id);
  };

  return { index, getName, getHref, getEntry, isLoaded: !!index };
}
