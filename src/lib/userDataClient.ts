'use client';

/**
 * Client-side helpers for server-backed favorites and notes.
 * Replaces direct localStorage usage with API calls.
 */

export interface FavMeta { name: string; href: string }

export interface FavoritesData {
  keys: string[];
  meta: Record<string, FavMeta>;
}

export type NotesMap = Record<string, { text: string; updatedAt: string }>;

// ── Favorites ────────────────────────────────────────────────

let favCache: FavoritesData | null = null;
let favSaveTimer: ReturnType<typeof setTimeout> | null = null;

export async function loadFavorites(): Promise<FavoritesData> {
  if (favCache) return favCache;
  try {
    const res = await fetch('/api/user/favorites');
    if (res.ok) {
      favCache = await res.json();
      return favCache!;
    }
  } catch { /* network error */ }
  favCache = { keys: [], meta: {} };
  return favCache;
}

export function saveFavorites(data: FavoritesData): void {
  favCache = data;
  if (favSaveTimer) clearTimeout(favSaveTimer);
  favSaveTimer = setTimeout(() => {
    fetch('/api/user/favorites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  }, 300);
}

// ── Notes ────────────────────────────────────────────────────

let notesCache: NotesMap | null = null;
let notesSaveTimer: ReturnType<typeof setTimeout> | null = null;

export async function loadNotes(): Promise<NotesMap> {
  if (notesCache) return notesCache;
  try {
    const res = await fetch('/api/user/notes');
    if (res.ok) {
      notesCache = await res.json();
      return notesCache!;
    }
  } catch { /* network error */ }
  notesCache = {};
  return notesCache;
}

export function saveNotes(data: NotesMap): void {
  notesCache = data;
  if (notesSaveTimer) clearTimeout(notesSaveTimer);
  notesSaveTimer = setTimeout(() => {
    fetch('/api/user/notes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  }, 500);
}
