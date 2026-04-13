'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconBookOpen, IconSearch } from '@/components/Icon';

// ── Types ──────────────────────────────────────────────────────────

interface DiseaseImage { url: string; fullUrl?: string; caption: string; source?: string }
interface ConsensusItem {
  id: string;
  title: string;
  summary: string;
  organization?: string;
  year?: number;
  sourceUrl?: string;
  viewUrl?: string;
}
interface LiteratureItem {
  id: string;
  title: string;
  summary: string;
  authors?: string;
  journal?: string;
  year?: number;
  sourceUrl?: string;
  viewUrl?: string;
}
interface DiseaseLike {
  id: string;
  nameZh: string;
  nameEn: string;
  organ: string;
  grossDescription?: string;
  microscopyImages?: DiseaseImage[];
  grossImages?: DiseaseImage[];
  images?: DiseaseImage[];
  expertConsensus?: ConsensusItem[];
  literature?: LiteratureItem[];
}
interface MarkerLike {
  id: string;
  nameZh: string;
  nameEn: string;
  abbreviation: string;
  expertConsensus?: ConsensusItem[];
  literature?: LiteratureItem[];
}

type EntityKind = 'disease' | 'marker';

// ── Page ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [kind, setKind] = useState<EntityKind>('disease');
  const [diseases, setDiseases] = useState<DiseaseLike[]>([]);
  const [markers, setMarkers] = useState<MarkerLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/all-diseases').then(r => r.json()),
      fetch('/api/markers').then(r => r.json()),
    ]).then(([d, m]) => {
      setDiseases(Array.isArray(d) ? d : []);
      setMarkers(Array.isArray(m) ? m : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const list = kind === 'disease' ? diseases : markers;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(x =>
      x.nameZh.includes(q) ||
      x.nameEn.toLowerCase().includes(q) ||
      x.id.toLowerCase().includes(q)
    );
  }, [list, search]);

  const selectedDisease = kind === 'disease'
    ? diseases.find(d => d.id === selected) || null
    : null;
  const selectedMarker = kind === 'marker'
    ? markers.find(m => m.id === selected) || null
    : null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const refreshDisease = async (organ: string, id: string) => {
    const fresh = await fetch(`/api/disease?organ=${organ}&id=${id}`).then(r => r.json());
    setDiseases(prev => prev.map(d => d.id === id ? { ...d, ...fresh } : d));
  };
  const refreshMarkers = async () => {
    const fresh = await fetch('/api/markers').then(r => r.json());
    setMarkers(Array.isArray(fresh) ? fresh : []);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--fg)' }}>内容管理</h1>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          维护疾病/标记物的 <b>专家共识</b>、<b>文献参考</b> 与 <b>图片资源</b>。保存会直接写入仓库中的 JSON 数据文件。
        </p>
      </div>

      {/* Entity-kind switch */}
      <div className="flex gap-1 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        {(['disease', 'marker'] as EntityKind[]).map(k => (
          <button
            key={k}
            onClick={() => { setKind(k); setSelected(null); }}
            className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderBottomColor: kind === k ? 'var(--accent)' : 'transparent',
              color: kind === k ? 'var(--fg)' : 'var(--fg-muted)',
            }}
          >
            {k === 'disease' ? `疾病 (${diseases.length})` : `标记物 (${markers.length})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* List panel */}
        <aside className="rounded-xl p-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }}>
              <IconSearch size={14} />
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索..."
              className="w-full text-sm pl-9 pr-3 py-2 rounded-lg outline-none"
              style={{ background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border)' }}
            />
          </div>
          {loading ? (
            <div className="text-xs py-4 text-center" style={{ color: 'var(--fg-muted)' }}>加载中...</div>
          ) : (
            <ul className="space-y-1 max-h-[70vh] overflow-y-auto">
              {filtered.map(x => (
                <li key={x.id}>
                  <button
                    onClick={() => setSelected(x.id)}
                    className="w-full text-left px-3 py-2 rounded-md text-xs transition-colors"
                    style={{
                      background: selected === x.id ? 'var(--card-hover)' : 'transparent',
                      color: selected === x.id ? 'var(--fg)' : 'var(--fg-muted)',
                      border: selected === x.id ? '1px solid var(--accent)' : '1px solid transparent',
                    }}
                  >
                    <div className="font-medium">{x.nameZh}</div>
                    <div className="text-[10px] opacity-70 truncate">{x.nameEn}</div>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="text-xs py-4 text-center" style={{ color: 'var(--fg-muted)' }}>无匹配结果</li>
              )}
            </ul>
          )}
        </aside>

        {/* Editor panel */}
        <main className="rounded-xl p-5 min-h-[70vh]" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {!selected && (
            <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--fg-muted)' }}>
              请从左侧选择一个{kind === 'disease' ? '疾病' : '标记物'}条目开始编辑
            </div>
          )}
          {kind === 'disease' && selectedDisease && (
            <DiseaseEditor
              disease={selectedDisease}
              onSaved={async (msg) => {
                await refreshDisease(selectedDisease.organ, selectedDisease.id);
                showToast(msg);
              }}
            />
          )}
          {kind === 'marker' && selectedMarker && (
            <MarkerEditor
              marker={selectedMarker}
              onSaved={async (msg) => {
                await refreshMarkers();
                showToast(msg);
              }}
            />
          )}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 rounded-xl px-4 py-3 text-sm shadow-lg"
          style={{ background: 'var(--card)', border: '1px solid var(--accent)', color: 'var(--fg)' }}
        >
          {toast}
        </div>
      )}

      <div className="mt-8 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
        <Link href="/atlas" style={{ color: 'var(--accent)' }}>返回图谱</Link>
        <span className="ml-4">提示：所有更改会即刻写入 <code>data/diseases/*.json</code> 或 <code>data/markers.json</code>，图片则保存到 <code>public/uploads/</code>。</span>
      </div>
    </div>
  );
}

// ── Disease Editor ─────────────────────────────────────────────────

function DiseaseEditor({ disease, onSaved }: { disease: DiseaseLike; onSaved: (msg: string) => void }) {
  const [consensus, setConsensus] = useState<ConsensusItem[]>([]);
  const [literature, setLiterature] = useState<LiteratureItem[]>([]);
  const [microImages, setMicroImages] = useState<DiseaseImage[]>([]);
  const [grossImages, setGrossImages] = useState<DiseaseImage[]>([]);
  const [busy, setBusy] = useState(false);

  // Reset local drafts whenever selection changes.
  useEffect(() => {
    setConsensus(disease.expertConsensus || []);
    setLiterature(disease.literature || []);
    setMicroImages(disease.microscopyImages || []);
    setGrossImages(disease.grossImages || []);
  }, [disease.id, disease.expertConsensus, disease.literature, disease.microscopyImages, disease.grossImages]);

  const save = async (updates: Record<string, unknown>, label: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/disease', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organ: disease.organ, id: disease.id, updates }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '保存失败');
      onSaved(`${label} 已保存`);
    } catch (e) {
      onSaved(`保存失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{disease.nameZh}</h2>
        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{disease.nameEn} · {disease.organ} · {disease.id}</p>
      </header>

      <ConsensusEditor
        items={consensus}
        onChange={setConsensus}
        onSave={() => save({ expertConsensus: consensus }, '专家共识')}
        busy={busy}
      />

      <LiteratureEditor
        items={literature}
        onChange={setLiterature}
        onSave={() => save({ literature }, '文献参考')}
        busy={busy}
      />

      <ImageEditor
        title="镜下特征图"
        scope={`diseases/${disease.id}/microscopy`}
        items={microImages}
        onChange={setMicroImages}
        onSave={() => save({ microscopyImages: microImages }, '镜下图片')}
        busy={busy}
      />
      <ImageEditor
        title="大体形态图"
        scope={`diseases/${disease.id}/gross`}
        items={grossImages}
        onChange={setGrossImages}
        onSave={() => save({ grossImages: grossImages }, '大体图片')}
        busy={busy}
      />
    </div>
  );
}

// ── Marker Editor ──────────────────────────────────────────────────

function MarkerEditor({ marker, onSaved }: { marker: MarkerLike; onSaved: (msg: string) => void }) {
  const [consensus, setConsensus] = useState<ConsensusItem[]>([]);
  const [literature, setLiterature] = useState<LiteratureItem[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setConsensus(marker.expertConsensus || []);
    setLiterature(marker.literature || []);
  }, [marker.id, marker.expertConsensus, marker.literature]);

  const save = async (updates: Record<string, unknown>, label: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/marker', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: marker.id, updates }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '保存失败');
      onSaved(`${label} 已保存`);
    } catch (e) {
      onSaved(`保存失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
          <span className="font-mono" style={{ color: 'var(--accent)' }}>{marker.abbreviation}</span>
          <span className="ml-2">{marker.nameZh}</span>
        </h2>
        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{marker.nameEn} · {marker.id}</p>
      </header>

      <ConsensusEditor
        items={consensus}
        onChange={setConsensus}
        onSave={() => save({ expertConsensus: consensus }, '专家共识')}
        busy={busy}
      />

      <LiteratureEditor
        items={literature}
        onChange={setLiterature}
        onSave={() => save({ literature }, '文献参考')}
        busy={busy}
      />
    </div>
  );
}

// ── Sub-editors ────────────────────────────────────────────────────

function SectionHead({ title, onAdd, onSave, busy }: { title: string; onAdd: () => void; onSave: () => void; busy: boolean }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
        <IconBookOpen size={14} style={{ color: 'var(--accent)' }} />
        {title}
      </h3>
      <div className="flex gap-2">
        <button
          onClick={onAdd}
          className="text-[11px] px-2.5 py-1 rounded-md"
          style={{ background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border)' }}
        >
          + 新增
        </button>
        <button
          onClick={onSave}
          disabled={busy}
          className="text-[11px] px-2.5 py-1 rounded-md"
          style={{ background: 'var(--accent)', color: '#fff', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}

function ConsensusEditor({
  items,
  onChange,
  onSave,
  busy,
}: {
  items: ConsensusItem[];
  onChange: (next: ConsensusItem[]) => void;
  onSave: () => void;
  busy: boolean;
}) {
  const update = (idx: number, patch: Partial<ConsensusItem>) => {
    onChange(items.map((x, i) => i === idx ? { ...x, ...patch } : x));
  };
  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };
  const add = () => {
    onChange([
      ...items,
      { id: `c-${Date.now()}`, title: '新共识条目', summary: '', organization: '', year: undefined },
    ]);
  };

  return (
    <section>
      <SectionHead title="专家共识" onAdd={add} onSave={onSave} busy={busy} />
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>暂无条目，点击右上角 &quot;+ 新增&quot; 添加</p>
        )}
        {items.map((c, i) => (
          <div key={c.id} className="rounded-lg p-3 space-y-2" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Field label="标题" value={c.title} onChange={v => update(i, { title: v })} span={3} />
              <Field label="机构" value={c.organization || ''} onChange={v => update(i, { organization: v })} />
              <Field label="年份" value={c.year?.toString() || ''} onChange={v => update(i, { year: Number(v) || undefined })} />
              <Field label="ID" value={c.id} onChange={v => update(i, { id: v })} mono />
            </div>
            <TextareaField label="简介" value={c.summary} onChange={v => update(i, { summary: v })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field label="源地址 URL" value={c.sourceUrl || ''} onChange={v => update(i, { sourceUrl: v })} />
              <Field label="在线阅览 URL" value={c.viewUrl || ''} onChange={v => update(i, { viewUrl: v })} />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => remove(i)}
                className="text-[11px] px-2 py-1 rounded"
                style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LiteratureEditor({
  items,
  onChange,
  onSave,
  busy,
}: {
  items: LiteratureItem[];
  onChange: (next: LiteratureItem[]) => void;
  onSave: () => void;
  busy: boolean;
}) {
  const update = (idx: number, patch: Partial<LiteratureItem>) => {
    onChange(items.map((x, i) => i === idx ? { ...x, ...patch } : x));
  };
  const remove = (idx: number) => { onChange(items.filter((_, i) => i !== idx)); };
  const add = () => {
    onChange([
      ...items,
      { id: `l-${Date.now()}`, title: '新文献条目', summary: '', authors: '', journal: '', year: undefined },
    ]);
  };

  return (
    <section>
      <SectionHead title="文献参考" onAdd={add} onSave={onSave} busy={busy} />
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>暂无条目</p>
        )}
        {items.map((lit, i) => (
          <div key={lit.id} className="rounded-lg p-3 space-y-2" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Field label="标题" value={lit.title} onChange={v => update(i, { title: v })} span={3} />
              <Field label="作者" value={lit.authors || ''} onChange={v => update(i, { authors: v })} />
              <Field label="期刊" value={lit.journal || ''} onChange={v => update(i, { journal: v })} />
              <Field label="年份" value={lit.year?.toString() || ''} onChange={v => update(i, { year: Number(v) || undefined })} />
            </div>
            <TextareaField label="简介" value={lit.summary} onChange={v => update(i, { summary: v })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field label="源地址 URL" value={lit.sourceUrl || ''} onChange={v => update(i, { sourceUrl: v })} />
              <Field label="在线阅览 URL" value={lit.viewUrl || ''} onChange={v => update(i, { viewUrl: v })} />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => remove(i)}
                className="text-[11px] px-2 py-1 rounded"
                style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ImageEditor({
  title,
  scope,
  items,
  onChange,
  onSave,
  busy,
}: {
  title: string;
  scope: string;
  items: DiseaseImage[];
  onChange: (next: DiseaseImage[]) => void;
  onSave: () => void;
  busy: boolean;
}) {
  const [uploading, setUploading] = useState(false);

  const update = (idx: number, patch: Partial<DiseaseImage>) => {
    onChange(items.map((x, i) => i === idx ? { ...x, ...patch } : x));
  };
  const remove = (idx: number) => { onChange(items.filter((_, i) => i !== idx)); };
  const addBlank = () => {
    onChange([...items, { url: '', caption: '' }]);
  };

  const uploadFile = async (file: File, field: 'url' | 'fullUrl', idx: number) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('scope', scope);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '上传失败');
      update(idx, { [field]: j.url });
    } catch (e) {
      alert(`上传失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section>
      <SectionHead title={title} onAdd={addBlank} onSave={onSave} busy={busy || uploading} />
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>暂无图片，可点 &quot;+ 新增&quot; 或直接拖拽上传</p>
        )}
        {items.map((img, i) => (
          <div key={i} className="rounded-lg p-3 space-y-2" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
              <div className="space-y-2">
                <Field label="压缩图 URL" value={img.url} onChange={v => update(i, { url: v })} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'url', i)}
                  className="text-[11px]"
                  style={{ color: 'var(--fg-muted)' }}
                />
                <Field label="原图 URL（可选）" value={img.fullUrl || ''} onChange={v => update(i, { fullUrl: v })} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'fullUrl', i)}
                  className="text-[11px]"
                  style={{ color: 'var(--fg-muted)' }}
                />
                <Field label="说明" value={img.caption} onChange={v => update(i, { caption: v })} />
                <Field label="来源" value={img.source || ''} onChange={v => update(i, { source: v })} />
              </div>
              <div className="flex flex-col items-stretch gap-2">
                {img.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt="" className="w-full aspect-square object-cover rounded" style={{ border: '1px solid var(--border)' }} />
                ) : (
                  <div className="w-full aspect-square rounded flex items-center justify-center text-[10px]" style={{ border: '1px dashed var(--border)', color: 'var(--fg-muted)' }}>
                    无预览
                  </div>
                )}
                <button
                  onClick={() => remove(i)}
                  className="text-[11px] px-2 py-1 rounded"
                  style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Primitive inputs ──────────────────────────────────────────────

function Field({ label, value, onChange, span, mono }: { label: string; value: string; onChange: (v: string) => void; span?: number; mono?: boolean }) {
  return (
    <label className={`block text-[11px] ${span === 3 ? 'sm:col-span-3' : span === 2 ? 'sm:col-span-2' : ''}`} style={{ color: 'var(--fg-muted)' }}>
      <span>{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`mt-1 w-full px-2.5 py-1.5 rounded-md outline-none text-xs ${mono ? 'font-mono' : ''}`}
        style={{ background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)' }}
      />
    </label>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-[11px]" style={{ color: 'var(--fg-muted)' }}>
      <span>{label}</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="mt-1 w-full px-2.5 py-1.5 rounded-md outline-none text-xs leading-relaxed"
        style={{ background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)', resize: 'vertical' }}
      />
    </label>
  );
}
