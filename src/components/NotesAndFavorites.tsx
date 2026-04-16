'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconStar, IconX } from '@/components/Icon';

const FAV_KEY = 'pathoatlas-favorites';
const NOTES_KEY = 'pathoatlas-notes';

interface Props {
  entityType: 'disease' | 'marker';
  entityId: string;
  entityName: string;
}

/** Pencil icon (inline to avoid adding to Icon.tsx) */
function PencilIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export default function NotesAndFavorites({ entityType, entityId, entityName }: Props) {
  const storageKey = `${entityType}:${entityId}`;
  const [isFav, setIsFav] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);

  // Read initial state from localStorage
  useEffect(() => {
    try {
      const favRaw = localStorage.getItem(FAV_KEY);
      const favs: string[] = favRaw ? JSON.parse(favRaw) : [];
      setIsFav(favs.includes(storageKey));
    } catch { /* empty */ }

    try {
      const notesRaw = localStorage.getItem(NOTES_KEY);
      const notes = notesRaw ? JSON.parse(notesRaw) : {};
      if (notes[storageKey]) {
        setNoteText(notes[storageKey].text || '');
      }
    } catch { /* empty */ }

    setMounted(true);
  }, [storageKey]);

  const toggleFav = useCallback(() => {
    setIsFav((prev) => {
      const next = !prev;
      try {
        const favRaw = localStorage.getItem(FAV_KEY);
        let favs: string[] = favRaw ? JSON.parse(favRaw) : [];
        if (next) {
          if (!favs.includes(storageKey)) favs.push(storageKey);
        } else {
          favs = favs.filter((f) => f !== storageKey);
        }
        localStorage.setItem(FAV_KEY, JSON.stringify(favs));
      } catch { /* empty */ }
      return next;
    });
  }, [storageKey]);

  const saveNote = useCallback(
    (text: string) => {
      try {
        const notesRaw = localStorage.getItem(NOTES_KEY);
        const notes = notesRaw ? JSON.parse(notesRaw) : {};
        if (text.trim()) {
          notes[storageKey] = { text, updatedAt: new Date().toISOString() };
        } else {
          delete notes[storageKey];
        }
        localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
      } catch { /* empty */ }
    },
    [storageKey],
  );

  const handleNoteChange = useCallback(
    (text: string) => {
      setNoteText(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => saveNote(text), 500);
    },
    [saveNote],
  );

  if (!mounted) return null;

  return (
    <>
      {/* Floating action bar */}
      <div
        className="flex flex-col gap-2"
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 20,
        }}
      >
        <button
          onClick={toggleFav}
          className="p-2.5 rounded-full shadow-lg transition-colors cursor-pointer"
          style={{
            background: isFav ? '#f59e0b' : 'var(--card)',
            color: isFav ? '#fff' : 'var(--fg-muted)',
            border: `1px solid ${isFav ? '#f59e0b' : 'var(--border)'}`,
          }}
          title={isFav ? '取消收藏' : '收藏'}
        >
          <IconStar size={18} style={isFav ? { fill: '#fff' } : undefined} />
        </button>
        <button
          onClick={() => setNoteOpen(true)}
          className="p-2.5 rounded-full shadow-lg transition-colors cursor-pointer"
          style={{
            background: 'var(--card)',
            color: noteText ? 'var(--accent)' : 'var(--fg-muted)',
            border: `1px solid ${noteText ? 'var(--accent)' : 'var(--border)'}`,
          }}
          title="添加笔记"
        >
          <PencilIcon size={18} />
        </button>
      </div>

      {/* Slide-in note panel */}
      {noteOpen && (
        <>
          {/* Overlay */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 40,
            }}
            onClick={() => setNoteOpen(false)}
          />
          {/* Panel */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: 400,
              background: 'var(--card)',
              borderLeft: '1px solid var(--border)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
            }}
          >
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                  {entityName}
                </div>
                <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                  {entityType === 'marker' ? '标记物笔记' : '疾病笔记'}
                </div>
              </div>
              <button
                onClick={() => setNoteOpen(false)}
                className="p-1.5 rounded-lg cursor-pointer"
                style={{ color: 'var(--fg-muted)' }}
              >
                <IconX size={18} />
              </button>
            </div>

            {/* Textarea */}
            <div className="flex-1 p-5">
              <textarea
                value={noteText}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="在此输入学习笔记..."
                className="w-full h-full rounded-xl border px-4 py-3 text-sm resize-none"
                style={{
                  background: 'var(--card)',
                  borderColor: 'var(--border)',
                  color: 'var(--fg)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Footer */}
            <div
              className="px-5 py-3 text-xs"
              style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-muted)' }}
            >
              自动保存
            </div>
          </div>
        </>
      )}
    </>
  );
}
