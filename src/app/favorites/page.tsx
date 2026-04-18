'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  IconStar, IconBookOpen, IconMicroscope, IconFlask,
  IconX, IconArrowRight,
} from '@/components/Icon';
import {
  loadFavorites, saveFavorites, loadNotes, saveNotes,
  type FavoritesData, type FavMeta, type NotesMap,
} from '@/lib/userDataClient';

function parseFavKey(key: string): { type: string; id: string } {
  const idx = key.indexOf(':');
  if (idx < 0) return { type: 'disease', id: key };
  return { type: key.slice(0, idx), id: key.slice(idx + 1) };
}

function favHref(type: string, id: string, meta?: FavMeta): string {
  if (meta?.href) return meta.href;
  if (type === 'marker') return `/markers/${id}`;
  return `/search?q=${encodeURIComponent(id)}`;
}

function favName(id: string, meta?: FavMeta): string {
  if (meta?.name) return meta.name;
  return id;
}

function exportNotesMarkdown(notes: NotesMap): string {
  const lines = ['# PathoAtlas - 我的笔记\n'];
  const entries = Object.entries(notes).sort(
    (a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt),
  );
  for (const [key, note] of entries) {
    const { type, id } = parseFavKey(key);
    lines.push(`## ${id} (${type})`);
    lines.push(`*${new Date(note.updatedAt).toLocaleString('zh-CN')}*\n`);
    lines.push(note.text);
    lines.push('');
  }
  return lines.join('\n');
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favMeta, setFavMeta] = useState<Record<string, FavMeta>>({});
  const [notes, setNotes] = useState<NotesMap>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    Promise.all([loadFavorites(), loadNotes()]).then(([favData, notesData]) => {
      setFavorites(favData.keys);
      setFavMeta(favData.meta);
      setNotes(notesData);
      setMounted(true);
    });
  }, []);

  const removeFavorite = useCallback((key: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f !== key);
      setFavMeta((prevMeta) => {
        const nextMeta = { ...prevMeta };
        delete nextMeta[key];
        saveFavorites({ keys: next, meta: nextMeta });
        return nextMeta;
      });
      return next;
    });
  }, []);

  const startEdit = useCallback((key: string, text: string) => {
    setEditingKey(key);
    setEditText(text);
  }, []);

  const saveNote = useCallback(() => {
    if (!editingKey) return;
    setNotes((prev) => {
      const next = {
        ...prev,
        [editingKey]: { text: editText, updatedAt: new Date().toISOString() },
      };
      saveNotes(next);
      return next;
    });
    setEditingKey(null);
    setEditText('');
  }, [editingKey, editText]);

  const deleteNote = useCallback((key: string) => {
    setNotes((prev) => {
      const next = { ...prev };
      delete next[key];
      saveNotes(next);
      return next;
    });
  }, []);

  const handleExport = useCallback(() => {
    const md = exportNotesMarkdown(notes);
    const date = new Date().toISOString().slice(0, 10);
    triggerDownload(md, `pathoatlas-notes-${date}.md`);
  }, [notes]);

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center" style={{ color: 'var(--fg-muted)' }}>
        加载中...
      </div>
    );
  }

  const noteEntries = Object.entries(notes).sort(
    (a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt),
  );
  const hasFavorites = favorites.length > 0;
  const hasNotes = noteEntries.length > 0;
  const isEmpty = !hasFavorites && !hasNotes;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
        <IconStar size={24} style={{ color: '#f59e0b' }} />
        收藏与笔记
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>
        你收藏的疾病、标记物以及学习笔记
      </p>

      {isEmpty && (
        <div className="rounded-2xl border p-12 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <IconStar size={48} style={{ color: 'var(--border)', margin: '0 auto 16px' }} />
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>暂无收藏</p>
          <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
            在疾病或标记物详情页点击星标即可收藏，点击铅笔图标可添加笔记
          </p>
          <Link href="/atlas" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>
            浏览图谱 <IconArrowRight size={14} />
          </Link>
        </div>
      )}

      {hasFavorites && (
        <section className="mb-10">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <IconStar size={16} style={{ color: '#f59e0b' }} />
            收藏 ({favorites.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {favorites.map((key) => {
              const { type, id } = parseFavKey(key);
              const meta = favMeta[key];
              return (
                <div key={key} className="rounded-xl border px-4 py-3 flex items-center gap-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                  {type === 'marker' ? (
                    <IconFlask size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                  ) : (
                    <IconMicroscope size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  )}
                  <Link href={favHref(type, id, meta)} className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>
                    {favName(id, meta)}
                  </Link>
                  <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{type === 'marker' ? '标记物' : '疾病'}</span>
                  <button onClick={() => removeFavorite(key)} className="p-1 rounded hover:bg-red-100 cursor-pointer" style={{ color: 'var(--danger)' }} title="取消收藏">
                    <IconX size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {hasNotes && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <IconBookOpen size={16} style={{ color: 'var(--accent)' }} />
              笔记 ({noteEntries.length})
            </h2>
            <button onClick={handleExport} className="px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>
              导出 Markdown
            </button>
          </div>
          <div className="space-y-3">
            {noteEntries.map(([key, note]) => {
              const { type, id } = parseFavKey(key);
              const meta = favMeta[key];
              const isEditing = editingKey === key;
              return (
                <div key={key} className="rounded-xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {type === 'marker' ? <IconFlask size={14} style={{ color: 'var(--success)' }} /> : <IconMicroscope size={14} style={{ color: 'var(--accent)' }} />}
                      <Link href={favHref(type, id, meta)} className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{favName(id, meta)}</Link>
                      <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{new Date(note.updatedAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => isEditing ? saveNote() : startEdit(key, note.text)} className="px-2 py-1 rounded text-xs cursor-pointer" style={{ color: 'var(--accent)' }}>
                        {isEditing ? '保存' : '编辑'}
                      </button>
                      <button onClick={() => deleteNote(key)} className="px-2 py-1 rounded text-xs cursor-pointer" style={{ color: 'var(--danger)' }}>删除</button>
                    </div>
                  </div>
                  {isEditing ? (
                    <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4}
                      className="w-full rounded-lg border px-3 py-2 text-sm resize-y"
                      style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--fg)' }} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--fg-muted)' }}>{note.text}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
