'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconBookOpen, IconSearch } from '@/components/Icon';

// ── Types ──────────────────────────────────────────────────────────

type Magnification = '2x' | '4x' | '10x' | '20x' | '40x' | '100x';
type StainType = 'HE' | 'IHC' | 'Special' | 'Gross';

interface DiseaseImage {
  url: string;
  fullUrl?: string;
  caption: string;
  source?: string;
  magnification?: Magnification;
  stainType?: StainType;
  ihcMarker?: string; // 当 stainType === 'IHC' 时
}
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
interface IhcRow { marker: string; result: string; note: string }
interface DiseaseLike {
  id: string;
  nameZh: string;
  nameEn: string;
  aliases?: string[];
  organ: string;
  category?: string;
  epidemiology?: string;
  clinicalFeatures?: string;
  grossPathology?: string;
  grossDescription?: string;
  microscopy?: string;
  keyFeatures?: string[];
  ihcProfile?: IhcRow[];
  molecularFeatures?: string;
  differentialDiagnosis?: string[];
  differentialDiagnosisNotes?: string;
  grading?: string;
  staging?: string;
  prognosis?: string;
  treatment?: string;
  images?: DiseaseImage[];
  microscopyImages?: DiseaseImage[];
  grossImages?: DiseaseImage[];
  expertConsensus?: ConsensusItem[];
  literature?: LiteratureItem[];
  references?: string[];
}
interface StainingGroup {
  id: string;
  label: string;
  description?: string;
  images: DiseaseImage[];
}
interface MarkerLike {
  id: string;
  nameZh: string;
  nameEn: string;
  abbreviation: string;
  category?: string;
  cloneInfo?: string;
  targetProtein?: string;
  cellularLocalization?: string;
  normalExpression?: string;
  function?: string;
  interpretation?: string;
  clinicalSignificance?: string;
  positiveIn?: string[];
  negativeIn?: string[];
  relatedDrugs?: string[];
  pitfalls?: string;
  references?: string[];
  expertConsensus?: ConsensusItem[];
  literature?: LiteratureItem[];
  stainingImages?: StainingGroup[];
}

interface OrganOption { id: string; nameZh: string; color: string }

const DISEASE_CATEGORIES = [
  { key: 'malignant', label: '恶性' },
  { key: 'benign', label: '良性' },
  { key: 'precancerous', label: '癌前' },
  { key: 'inflammatory', label: '炎症' },
  { key: 'other', label: '其他' },
];

const MARKER_CATEGORIES = [
  '上皮标记', '间叶标记', '淋巴标记', '激素受体',
  '增殖标记', '神经标记', '分子标记', '其他',
];

type EntityKind = 'disease' | 'marker';

// ── Page ───────────────────────────────────────────────────────────

const NEW_SENTINEL = '__new__';

// Blank draft scaffolds for the create flows. These keep the admin UI
// self-contained without waiting for an API round-trip to learn field names.
function blankDiseaseDraft(defaultOrgan: string): DiseaseLike {
  return {
    id: '',
    nameZh: '',
    nameEn: '',
    aliases: [],
    organ: defaultOrgan,
    category: 'other',
    epidemiology: '',
    clinicalFeatures: '',
    grossPathology: '',
    grossDescription: '',
    microscopy: '',
    keyFeatures: [],
    ihcProfile: [],
    molecularFeatures: '',
    differentialDiagnosis: [],
    differentialDiagnosisNotes: '',
    grading: '',
    staging: '',
    prognosis: '',
    treatment: '',
    images: [],
    microscopyImages: [],
    grossImages: [],
    expertConsensus: [],
    literature: [],
    references: [],
  };
}

function blankMarkerDraft(): MarkerLike {
  return {
    id: '',
    nameZh: '',
    nameEn: '',
    abbreviation: '',
    category: '其他',
    cloneInfo: '',
    targetProtein: '',
    cellularLocalization: '',
    normalExpression: '',
    function: '',
    interpretation: '',
    clinicalSignificance: '',
    positiveIn: [],
    negativeIn: [],
    relatedDrugs: [],
    pitfalls: '',
    references: [],
    expertConsensus: [],
    literature: [],
    stainingImages: [],
  };
}

// ── Auth gate ──────────────────────────────────────────────────────

interface AuthState {
  status: 'loading' | 'open' | 'authenticated' | 'needs-login';
  email?: string | null;
  googleConfigured?: boolean;
  error?: string;
}

export default function AdminPage() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });

  const loadAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const j = await res.json();
        if (j.authRequired === false) {
          setAuth({ status: 'open' });
        } else {
          setAuth({ status: 'authenticated', email: j.email });
        }
        return;
      }
      if (res.status === 401) {
        const j = await res.json().catch(() => ({}));
        setAuth({ status: 'needs-login', googleConfigured: !!j.googleConfigured });
        return;
      }
      setAuth({ status: 'needs-login', error: `auth error: ${res.status}` });
    } catch (e) {
      setAuth({ status: 'needs-login', error: e instanceof Error ? e.message : '无法连接鉴权服务' });
    }
  };

  useEffect(() => {
    // Read auth_error from query string once on mount (set by the OAuth
    // callback when sign-in fails), then clean it up so refresh doesn't
    // show a stale error.
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('auth_error');
      const badEmail = params.get('email');
      if (err) {
        // Sanitize attacker-controlled query params: truncate and strip HTML
        const safeErr = (err || '').replace(/[<>"'&]/g, '').slice(0, 100);
        const safeEmail = (badEmail || '').replace(/[<>"'&]/g, '').slice(0, 100);
        setAuth({
          status: 'needs-login',
          error: `${safeErr}${safeEmail ? ` (${safeEmail})` : ''}`,
          googleConfigured: true,
        });
        params.delete('auth_error');
        params.delete('email');
        const qs = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
        return;
      }
    }
    loadAuth();
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuth({ status: 'needs-login', googleConfigured: true });
  };

  if (auth.status === 'loading') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse" style={{ color: 'var(--fg-muted)' }}>加载中...</div>
      </div>
    );
  }

  if (auth.status === 'needs-login') {
    return <LoginScreen error={auth.error} googleConfigured={auth.googleConfigured ?? true} />;
  }

  return (
    <AdminInner
      currentEmail={auth.status === 'authenticated' ? auth.email || null : null}
      onLogout={auth.status === 'authenticated' ? logout : undefined}
    />
  );
}

// ── Login screen ───────────────────────────────────────────────────

function LoginScreen({ error, googleConfigured }: { error?: string; googleConfigured: boolean }) {
  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--fg)' }}>内容管理 · 登录</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
          该页面只对授权 Google 账户开放。请使用管理员分配的账号登录。
        </p>
        {error && (
          <div
            className="rounded-lg p-3 mb-4 text-xs text-left"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            登录失败：{error}
          </div>
        )}
        {googleConfigured ? (
          <a
            href="/api/auth/login?returnTo=/admin"
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}
          >
            使用 Google 账号登录
          </a>
        ) : (
          <div className="rounded-lg p-3 text-xs text-left" style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}>
            <div className="font-semibold mb-1" style={{ color: 'var(--fg)' }}>Google OAuth 尚未配置</div>
            <div>部署时请设置以下环境变量：</div>
            <code className="block mt-2 text-[10px] whitespace-pre-wrap">{`GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ADMIN_EMAILS=you@example.com
AUTH_SECRET=<32+ random bytes>
# optional for external AI callers:
ADMIN_API_TOKEN=<long random string>`}</code>
          </div>
        )}
        <div className="mt-6 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
          <Link href="/atlas" style={{ color: 'var(--accent)' }}>返回图谱</Link>
        </div>
      </div>
    </div>
  );
}

// ── Admin (authenticated) ──────────────────────────────────────────

function AdminInner({ currentEmail, onLogout }: { currentEmail: string | null; onLogout?: () => void }) {
  const [kind, setKind] = useState<EntityKind>('disease');
  const [diseases, setDiseases] = useState<DiseaseLike[]>([]);
  const [markers, setMarkers] = useState<MarkerLike[]>([]);
  const [organs, setOrgans] = useState<OrganOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // 疾病筛选
  const [filterOrgan, setFilterOrgan] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  // 标记物筛选
  const [filterMarkerCategory, setFilterMarkerCategory] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/all-diseases').then(r => r.json()),
      fetch('/api/markers').then(r => r.json()),
      fetch('/api/organs').then(r => r.json()),
    ]).then(([d, m, o]) => {
      setDiseases(Array.isArray(d) ? d : []);
      setMarkers(Array.isArray(m) ? m : []);
      setOrgans(Array.isArray(o) ? o : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const list = kind === 'disease' ? diseases : markers;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = list.filter(x =>
      x.nameZh.includes(q) ||
      x.nameEn.toLowerCase().includes(q) ||
      x.id.toLowerCase().includes(q)
    );

    // 针对疾病的额外筛选
    if (kind === 'disease') {
      if (filterOrgan) {
        result = result.filter(x => (x as DiseaseLike).organ === filterOrgan);
      }
      if (filterCategory) {
        result = result.filter(x => (x as DiseaseLike).category === filterCategory);
      }
    }

    // 针对标记物的额外筛选
    if (kind === 'marker') {
      if (filterMarkerCategory) {
        result = result.filter(x => (x as MarkerLike).category === filterMarkerCategory);
      }
    }

    return result;
  }, [list, search, kind, filterOrgan, filterCategory, filterMarkerCategory]);

  // The editor receives either the real record from state (update mode) or
  // a blank scaffold (create mode, when selected === NEW_SENTINEL).
  const isCreating = selected === NEW_SENTINEL;
  const selectedDisease: DiseaseLike | null = (() => {
    if (kind !== 'disease') return null;
    if (isCreating) return blankDiseaseDraft(organs[0]?.id || 'lung');
    return diseases.find(d => d.id === selected) || null;
  })();
  const selectedMarker: MarkerLike | null = (() => {
    if (kind !== 'marker') return null;
    if (isCreating) return blankMarkerDraft();
    return markers.find(m => m.id === selected) || null;
  })();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const refreshDisease = async (organ: string, id: string) => {
    const fresh = await fetch(`/api/disease?organ=${organ}&id=${id}`).then(r => r.json());
    setDiseases(prev => {
      const idx = prev.findIndex(d => d.id === id);
      if (idx >= 0) return prev.map(d => d.id === id ? { ...d, ...fresh } : d);
      return [...prev, fresh];
    });
  };
  const refreshAllDiseases = async () => {
    const fresh = await fetch('/api/all-diseases').then(r => r.json());
    setDiseases(Array.isArray(fresh) ? fresh : []);
  };
  const refreshMarkers = async () => {
    const fresh = await fetch('/api/markers').then(r => r.json());
    setMarkers(Array.isArray(fresh) ? fresh : []);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--fg)' }}>内容管理</h1>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            维护疾病/标记物的 <b>专家共识</b>、<b>文献参考</b> 与 <b>图片资源</b>。保存会直接写入仓库中的 JSON 数据文件。
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {currentEmail ? (
            <>
              <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                登录为 <span style={{ color: 'var(--fg)' }}>{currentEmail}</span>
              </span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="text-xs px-3 py-1.5 rounded-md"
                  style={{ background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                >
                  登出
                </button>
              )}
            </>
          ) : (
            <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
              dev 模式（未启用鉴权）
            </span>
          )}
        </div>
      </div>

      {/* Entity-kind switch */}
      <div className="flex gap-1 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        {(['disease', 'marker'] as EntityKind[]).map(k => (
          <button
            key={k}
            onClick={() => { 
              setKind(k);
              setSelected(null);
              setSearch('');
              setFilterOrgan('');
              setFilterCategory('');
              setFilterMarkerCategory('');
            }}
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
          <button
            onClick={() => setSelected(NEW_SENTINEL)}
            className="w-full text-xs font-medium px-3 py-2 rounded-md mb-3"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            + 新建{kind === 'disease' ? '疾病' : '标记物'}
          </button>
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

          {/* Filters */}
          <div className="space-y-2 mb-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            {kind === 'disease' && (
              <>
                <select
                  value={filterOrgan}
                  onChange={e => setFilterOrgan(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-md outline-none"
                  style={{ background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                >
                  <option value="">全部器官</option>
                  {organs.map(o => (
                    <option key={o.id} value={o.id}>{o.nameZh}</option>
                  ))}
                </select>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-md outline-none"
                  style={{ background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                >
                  <option value="">全部分类</option>
                  {DISEASE_CATEGORIES.map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </>
            )}
            {kind === 'marker' && (
              <select
                value={filterMarkerCategory}
                onChange={e => setFilterMarkerCategory(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-md outline-none"
                style={{ background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border)' }}
              >
                <option value="">全部分类</option>
                {MARKER_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
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
                    <div className="font-medium">{x.nameZh || x.id}</div>
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
              请从左侧选择一个{kind === 'disease' ? '疾病' : '标记物'}条目，或点击顶部 &quot;+ 新建&quot; 创建
            </div>
          )}
          {kind === 'disease' && selectedDisease && (
            <DiseaseEditor
              key={selected || 'new-disease'}
              disease={selectedDisease}
              organs={organs}
              isNew={isCreating}
              onSaved={async (msg) => {
                if (!isCreating && selectedDisease.organ && selectedDisease.id) {
                  await refreshDisease(selectedDisease.organ, selectedDisease.id);
                }
                showToast(msg);
              }}
              onCreated={async (organ, id) => {
                await refreshAllDiseases();
                setSelected(id);
                showToast(`已创建：${id}`);
              }}
              onDeleted={async () => {
                await refreshAllDiseases();
                setSelected(null);
              }}
            />
          )}
          {kind === 'marker' && selectedMarker && (
            <MarkerEditor
              key={selected || 'new-marker'}
              marker={selectedMarker}
              isNew={isCreating}
              onSaved={async (msg) => {
                await refreshMarkers();
                showToast(msg);
              }}
              onCreated={async (id) => {
                await refreshMarkers();
                setSelected(id);
                showToast(`已创建：${id}`);
              }}
              onDeleted={async () => {
                await refreshMarkers();
                setSelected(null);
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

function DiseaseEditor({
  disease,
  organs,
  isNew,
  onSaved,
  onCreated,
  onDeleted,
}: {
  disease: DiseaseLike;
  organs: OrganOption[];
  isNew: boolean;
  onSaved: (msg: string) => void;
  onCreated: (organ: string, id: string) => void;
  onDeleted: () => void;
}) {
  // The editor keeps a single local draft that mirrors every editable field
  // on the disease. Section-level save buttons patch individual fields via
  // PUT; "保存全部" pushes the whole draft in one call; 新建 flow POSTs.
  const [draft, setDraft] = useState<DiseaseLike>(disease);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(disease);
  }, [disease]);

  const patch = <K extends keyof DiseaseLike>(key: K, value: DiseaseLike[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  // Collect every editable field in one payload for bulk save / create.
  const collectPayload = (d: DiseaseLike): Record<string, unknown> => ({
    nameZh: d.nameZh || '',
    nameEn: d.nameEn || '',
    aliases: d.aliases || [],
    category: d.category || 'other',
    epidemiology: d.epidemiology || '',
    clinicalFeatures: d.clinicalFeatures || '',
    grossPathology: d.grossPathology || '',
    grossDescription: d.grossDescription || '',
    microscopy: d.microscopy || '',
    keyFeatures: d.keyFeatures || [],
    ihcProfile: d.ihcProfile || [],
    molecularFeatures: d.molecularFeatures || '',
    differentialDiagnosis: d.differentialDiagnosis || [],
    differentialDiagnosisNotes: d.differentialDiagnosisNotes || '',
    grading: d.grading || '',
    staging: d.staging || '',
    prognosis: d.prognosis || '',
    treatment: d.treatment || '',
    images: d.images || [],
    microscopyImages: d.microscopyImages || [],
    grossImages: d.grossImages || [],
    expertConsensus: d.expertConsensus || [],
    literature: d.literature || [],
    references: d.references || [],
  });

  const save = async (updates: Record<string, unknown>, label: string) => {
    if (isNew) {
      onSaved('请先点击"保存创建"完成新建');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/disease', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organ: draft.organ, id: draft.id, updates }),
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

  const saveAll = async () => {
    setBusy(true);
    try {
      const payload = collectPayload(draft);
      const res = await fetch('/api/admin/disease', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organ: draft.organ, id: draft.id, updates: payload }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '保存失败');
      onSaved('全部字段已保存');
    } catch (e) {
      onSaved(`保存失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setBusy(false);
    }
  };

  const createNew = async () => {
    if (!draft.id || !draft.organ) {
      onSaved('id 和 organ 必填');
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(draft.id)) {
      onSaved('id 必须是小写字母、数字和连字符 (kebab-case)');
      return;
    }
    setBusy(true);
    try {
      const payload = { id: draft.id, ...collectPayload(draft) };
      const res = await fetch('/api/admin/disease', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organ: draft.organ, disease: payload }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '创建失败');
      onCreated(draft.organ, draft.id);
      onSaved(`已创建：${draft.nameZh || draft.id}`);
    } catch (e) {
      onSaved(`创建失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setBusy(false);
    }
  };

  const deleteEntity = async () => {
    if (!confirm(`确定删除 ${draft.nameZh || draft.id}？此操作不可恢复。`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/disease?organ=${encodeURIComponent(draft.organ)}&id=${encodeURIComponent(draft.id)}`, {
        method: 'DELETE',
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '删除失败');
      onDeleted();
      onSaved(`已删除：${draft.nameZh || draft.id}`);
    } catch (e) {
      onSaved(`删除失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
            {isNew ? '新建疾病' : (draft.nameZh || draft.id)}
          </h2>
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            {isNew ? '填写以下字段后点击"保存创建"' : `${draft.nameEn} · ${draft.organ} · ${draft.id}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isNew ? (
            <button
              onClick={createNew}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-md"
              style={{ background: 'var(--accent)', color: '#fff', opacity: busy ? 0.6 : 1 }}
            >
              {busy ? '创建中...' : '保存创建'}
            </button>
          ) : (
            <>
              <button
                onClick={saveAll}
                disabled={busy}
                className="text-xs px-3 py-1.5 rounded-md"
                style={{ background: 'var(--accent)', color: '#fff', opacity: busy ? 0.6 : 1 }}
              >
                {busy ? '保存中...' : '保存全部'}
              </button>
              <button
                onClick={deleteEntity}
                disabled={busy}
                className="text-xs px-3 py-1.5 rounded-md"
                style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
              >
                删除
              </button>
            </>
          )}
        </div>
      </header>

      {/* Basic identity section */}
      <section className="rounded-lg p-4 space-y-3" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
        <h3 className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>基本信息</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="ID (slug)" value={draft.id} onChange={v => isNew && patch('id', v)} mono />
          <SelectField
            label="器官"
            value={draft.organ}
            disabled={!isNew}
            onChange={v => patch('organ', v)}
            options={organs.map(o => ({ key: o.id, label: o.nameZh }))}
          />
          <Field label="中文名" value={draft.nameZh || ''} onChange={v => patch('nameZh', v)} />
          <Field label="英文名" value={draft.nameEn || ''} onChange={v => patch('nameEn', v)} />
          <SelectField
            label="类别"
            value={draft.category || 'other'}
            onChange={v => patch('category', v)}
            options={DISEASE_CATEGORIES}
          />
        </div>
        <StringArrayEditor
          label="别名"
          items={draft.aliases || []}
          onChange={v => patch('aliases', v)}
          placeholder="输入别名回车添加"
        />
      </section>

      {/* Clinical + gross + microscopy narratives */}
      <section className="rounded-lg p-4 space-y-3" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
        <h3 className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>核心描述</h3>
        <TextareaField label="流行病学" value={draft.epidemiology || ''} onChange={v => patch('epidemiology', v)} />
        <TextareaField label="临床特征" value={draft.clinicalFeatures || ''} onChange={v => patch('clinicalFeatures', v)} />
        <TextareaField label="大体观察 (grossPathology)" value={draft.grossPathology || ''} onChange={v => patch('grossPathology', v)} />
        <TextareaField label="大体描述 (grossDescription, Markdown)" value={draft.grossDescription || ''} onChange={v => patch('grossDescription', v)} rows={5} />
        <TextareaField label="镜下特征 (Markdown)" value={draft.microscopy || ''} onChange={v => patch('microscopy', v)} rows={6} />
        <TextareaField label="分子特征" value={draft.molecularFeatures || ''} onChange={v => patch('molecularFeatures', v)} />
      </section>

      {/* Diagnostic key points + IHC + differentials */}
      <section className="rounded-lg p-4 space-y-3" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
        <h3 className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>诊断要点 / 免疫组化 / 鉴别</h3>
        <StringArrayEditor
          label="诊断要点 (keyFeatures)"
          items={draft.keyFeatures || []}
          onChange={v => patch('keyFeatures', v)}
          placeholder="要点内容回车添加"
        />
        <IhcProfileEditor
          items={draft.ihcProfile || []}
          onChange={v => patch('ihcProfile', v)}
        />
        <StringArrayEditor
          label="鉴别诊断 (disease ID)"
          items={draft.differentialDiagnosis || []}
          onChange={v => patch('differentialDiagnosis', v)}
          placeholder="输入需鉴别的 disease ID 回车"
        />
        <TextareaField
          label="鉴别要点 (Markdown，可用 -/** 列表和加粗)"
          value={draft.differentialDiagnosisNotes || ''}
          onChange={v => patch('differentialDiagnosisNotes', v)}
          rows={6}
        />
      </section>

      {/* Grading / staging / prognosis / treatment */}
      <section className="rounded-lg p-4 space-y-3" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
        <h3 className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>分级/分期/预后/治疗</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="分级" value={draft.grading || ''} onChange={v => patch('grading', v)} />
          <Field label="分期" value={draft.staging || ''} onChange={v => patch('staging', v)} />
        </div>
        <TextareaField label="预后" value={draft.prognosis || ''} onChange={v => patch('prognosis', v)} />
        <TextareaField label="治疗" value={draft.treatment || ''} onChange={v => patch('treatment', v)} />
      </section>

      {/* References */}
      <section className="rounded-lg p-4" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
        <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--accent)' }}>参考来源</h3>
        <StringArrayEditor
          label={'references（文字引用，结构化条目请用"文献参考"区块）'}
          items={draft.references || []}
          onChange={v => patch('references', v)}
          placeholder="如 WHO Thoracic Tumours, 5th Ed"
        />
      </section>

      {!isNew && (
        <>
          <ConsensusEditor
            items={draft.expertConsensus || []}
            onChange={v => patch('expertConsensus', v)}
            onSave={() => save({ expertConsensus: draft.expertConsensus || [] }, '专家共识')}
            busy={busy}
            scope={`diseases/${draft.id}/consensus`}
          />

          <LiteratureEditor
            items={draft.literature || []}
            onChange={v => patch('literature', v)}
            onSave={() => save({ literature: draft.literature || [] }, '文献参考')}
            busy={busy}
            scope={`diseases/${draft.id}/literature`}
          />

          <ImageEditor
            title="镜下特征图"
            scope={`diseases/${draft.id}/microscopy`}
            items={draft.microscopyImages || []}
            onChange={v => patch('microscopyImages', v)}
            onSave={() => save({ microscopyImages: draft.microscopyImages || [] }, '镜下图片')}
            busy={busy}
          />
          <ImageEditor
            title="大体形态图"
            scope={`diseases/${draft.id}/gross`}
            items={draft.grossImages || []}
            onChange={v => patch('grossImages', v)}
            onSave={() => save({ grossImages: draft.grossImages || [] }, '大体图片')}
            busy={busy}
          />
        </>
      )}
    </div>
  );
}

// ── Marker Editor ──────────────────────────────────────────────────

function MarkerEditor({
  marker,
  isNew,
  onSaved,
  onCreated,
  onDeleted,
}: {
  marker: MarkerLike;
  isNew: boolean;
  onSaved: (msg: string) => void;
  onCreated: (id: string) => void;
  onDeleted: () => void;
}) {
  const [draft, setDraft] = useState<MarkerLike>(marker);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(marker);
  }, [marker]);

  const patch = <K extends keyof MarkerLike>(key: K, value: MarkerLike[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const collectPayload = (m: MarkerLike): Record<string, unknown> => ({
    nameZh: m.nameZh || '',
    nameEn: m.nameEn || '',
    abbreviation: m.abbreviation || '',
    category: m.category || '其他',
    cloneInfo: m.cloneInfo || '',
    targetProtein: m.targetProtein || '',
    cellularLocalization: m.cellularLocalization || '',
    normalExpression: m.normalExpression || '',
    function: m.function || '',
    interpretation: m.interpretation || '',
    clinicalSignificance: m.clinicalSignificance || '',
    positiveIn: m.positiveIn || [],
    negativeIn: m.negativeIn || [],
    relatedDrugs: m.relatedDrugs || [],
    pitfalls: m.pitfalls || '',
    references: m.references || [],
    expertConsensus: m.expertConsensus || [],
    literature: m.literature || [],
    stainingImages: m.stainingImages || [],
  });

  const save = async (updates: Record<string, unknown>, label: string) => {
    if (isNew) {
      onSaved('请先点击"保存创建"完成新建');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/marker', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draft.id, updates }),
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

  const saveAll = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/marker', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draft.id, updates: collectPayload(draft) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '保存失败');
      onSaved('全部字段已保存');
    } catch (e) {
      onSaved(`保存失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setBusy(false);
    }
  };

  const createNew = async () => {
    if (!draft.id) {
      onSaved('id 必填');
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(draft.id)) {
      onSaved('id 必须是 kebab-case 纯 ASCII');
      return;
    }
    setBusy(true);
    try {
      const payload = { id: draft.id, ...collectPayload(draft) };
      const res = await fetch('/api/admin/marker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marker: payload }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '创建失败');
      onCreated(draft.id);
      onSaved(`已创建：${draft.abbreviation || draft.id}`);
    } catch (e) {
      onSaved(`创建失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setBusy(false);
    }
  };

  const deleteEntity = async () => {
    if (!confirm(`确定删除 ${draft.abbreviation || draft.id}？此操作不可恢复。`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/marker?id=${encodeURIComponent(draft.id)}`, { method: 'DELETE' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '删除失败');
      onDeleted();
      onSaved(`已删除：${draft.abbreviation || draft.id}`);
    } catch (e) {
      onSaved(`删除失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
            {isNew ? '新建标记物' : (
              <>
                <span className="font-mono" style={{ color: 'var(--accent)' }}>{draft.abbreviation || draft.id}</span>
                <span className="ml-2">{draft.nameZh}</span>
              </>
            )}
          </h2>
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            {isNew ? '填写以下字段后点击"保存创建"' : `${draft.nameEn} · ${draft.id}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isNew ? (
            <button
              onClick={createNew}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-md"
              style={{ background: 'var(--accent)', color: '#fff', opacity: busy ? 0.6 : 1 }}
            >
              {busy ? '创建中...' : '保存创建'}
            </button>
          ) : (
            <>
              <button
                onClick={saveAll}
                disabled={busy}
                className="text-xs px-3 py-1.5 rounded-md"
                style={{ background: 'var(--accent)', color: '#fff', opacity: busy ? 0.6 : 1 }}
              >
                {busy ? '保存中...' : '保存全部'}
              </button>
              <button
                onClick={deleteEntity}
                disabled={busy}
                className="text-xs px-3 py-1.5 rounded-md"
                style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
              >
                删除
              </button>
            </>
          )}
        </div>
      </header>

      {/* Basic identity */}
      <section className="rounded-lg p-4 space-y-3" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
        <h3 className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>基本信息</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="ID (slug)" value={draft.id} onChange={v => isNew && patch('id', v)} mono />
          <Field label="缩写 (abbreviation)" value={draft.abbreviation || ''} onChange={v => patch('abbreviation', v)} mono />
          <Field label="中文名" value={draft.nameZh || ''} onChange={v => patch('nameZh', v)} />
          <Field label="英文名" value={draft.nameEn || ''} onChange={v => patch('nameEn', v)} />
          <SelectField
            label="类别"
            value={draft.category || '其他'}
            onChange={v => patch('category', v)}
            options={MARKER_CATEGORIES.map(c => ({ key: c, label: c }))}
          />
          <Field label="亚细胞定位" value={draft.cellularLocalization || ''} onChange={v => patch('cellularLocalization', v)} />
          <Field label="克隆号" value={draft.cloneInfo || ''} onChange={v => patch('cloneInfo', v)} mono />
        </div>
      </section>

      {/* Expression + interpretation */}
      <section className="rounded-lg p-4 space-y-3" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
        <h3 className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>表达与判读</h3>
        <Field label="靶蛋白" value={draft.targetProtein || ''} onChange={v => patch('targetProtein', v)} />
        <Field label="正常表达" value={draft.normalExpression || ''} onChange={v => patch('normalExpression', v)} />
        <TextareaField label="功能" value={draft.function || ''} onChange={v => patch('function', v)} />
        <TextareaField label="判读标准" value={draft.interpretation || ''} onChange={v => patch('interpretation', v)} />
        <TextareaField label="临床意义" value={draft.clinicalSignificance || ''} onChange={v => patch('clinicalSignificance', v)} />
        <TextareaField label="诊断陷阱 (pitfalls)" value={draft.pitfalls || ''} onChange={v => patch('pitfalls', v)} />
      </section>

      {/* Expression profile tags */}
      <section className="rounded-lg p-4 space-y-3" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
        <h3 className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>表达谱</h3>
        <StringArrayEditor label="阳性表达 (positiveIn)" items={draft.positiveIn || []} onChange={v => patch('positiveIn', v)} />
        <StringArrayEditor label="阴性表达 (negativeIn)" items={draft.negativeIn || []} onChange={v => patch('negativeIn', v)} />
        <StringArrayEditor label="相关靶向药 (relatedDrugs)" items={draft.relatedDrugs || []} onChange={v => patch('relatedDrugs', v)} />
      </section>

      <section className="rounded-lg p-4" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
        <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--accent)' }}>参考来源</h3>
        <StringArrayEditor
          label="references"
          items={draft.references || []}
          onChange={v => patch('references', v)}
          placeholder="输入参考来源回车添加"
        />
      </section>

      {!isNew && (
        <>
          <ConsensusEditor
            items={draft.expertConsensus || []}
            onChange={v => patch('expertConsensus', v)}
            onSave={() => save({ expertConsensus: draft.expertConsensus || [] }, '专家共识')}
            busy={busy}
            scope={`markers/${draft.id}/consensus`}
          />

          <LiteratureEditor
            items={draft.literature || []}
            onChange={v => patch('literature', v)}
            onSave={() => save({ literature: draft.literature || [] }, '文献参考')}
            busy={busy}
            scope={`markers/${draft.id}/literature`}
          />

          <StainingGroupsEditor
            markerId={draft.id}
            groups={draft.stainingImages || []}
            onChange={v => patch('stainingImages', v)}
            onSave={() => save({ stainingImages: draft.stainingImages || [] }, '染色形态图')}
            busy={busy}
          />
        </>
      )}
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
  scope,
}: {
  items: ConsensusItem[];
  onChange: (next: ConsensusItem[]) => void;
  onSave: () => void;
  busy: boolean;
  scope: string;
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
              <Field label="源地址 URL（出版商/原始发布页）" value={c.sourceUrl || ''} onChange={v => update(i, { sourceUrl: v })} />
              <Field label="在线阅览 URL（PubMed/摘要/PDF）" value={c.viewUrl || ''} onChange={v => update(i, { viewUrl: v })} />
            </div>
            <PdfUploadButton
              scope={`${scope}/${c.id}`}
              currentUrl={c.viewUrl}
              onUploaded={(url) => update(i, { viewUrl: url })}
            />
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
  scope,
}: {
  items: LiteratureItem[];
  onChange: (next: LiteratureItem[]) => void;
  onSave: () => void;
  busy: boolean;
  scope: string;
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
              <Field label="源地址 URL（期刊 DOI/原文页）" value={lit.sourceUrl || ''} onChange={v => update(i, { sourceUrl: v })} />
              <Field label="在线阅览 URL（PubMed/摘要/PDF）" value={lit.viewUrl || ''} onChange={v => update(i, { viewUrl: v })} />
            </div>
            <PdfUploadButton
              scope={`${scope}/${lit.id}`}
              currentUrl={lit.viewUrl}
              onUploaded={(url) => update(i, { viewUrl: url })}
            />
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
      // When the server generated a thumbnail (image upload), auto-populate
      // BOTH url and fullUrl so the user doesn't have to upload twice. The
      // rule: thumbnail → url (gallery grid), original → fullUrl (lightbox).
      // For non-image uploads (PDFs, gifs) the response only has `url` and
      // we fall back to the old single-field behavior.
      if (j.thumbnail && j.fullUrl) {
        update(idx, { url: j.url, fullUrl: j.fullUrl });
      } else {
        update(idx, { [field]: j.url });
      }
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
                <SelectField
                  label="放大倍数"
                  value={img.magnification || ''}
                  onChange={v => update(i, { magnification: v as Magnification | undefined })}
                  options={[
                    { key: '', label: '未指定' },
                    { key: '2x', label: '2x' },
                    { key: '4x', label: '4x' },
                    { key: '10x', label: '10x' },
                    { key: '20x', label: '20x' },
                    { key: '40x', label: '40x' },
                    { key: '100x', label: '100x' },
                  ]}
                />
                <SelectField
                  label="染色类型"
                  value={img.stainType || ''}
                  onChange={v => update(i, { stainType: v as StainType | undefined })}
                  options={[
                    { key: '', label: '未指定' },
                    { key: 'HE', label: 'HE（常规）' },
                    { key: 'IHC', label: 'IHC（免疫组化）' },
                    { key: 'Special', label: '特殊染色' },
                    { key: 'Gross', label: '大体标本' },
                  ]}
                />
                {img.stainType === 'IHC' && (
                  <Field
                    label="IHC标记物（如 CD20）"
                    value={img.ihcMarker || ''}
                    onChange={v => update(i, { ihcMarker: v || undefined })}
                    placeholder="可选"
                  />
                )}
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

function StainingGroupsEditor({
  markerId,
  groups,
  onChange,
  onSave,
  busy,
}: {
  markerId: string;
  groups: StainingGroup[];
  onChange: (next: StainingGroup[]) => void;
  onSave: () => void;
  busy: boolean;
}) {
  const [uploading, setUploading] = useState(false);

  const updateGroup = (idx: number, patch: Partial<StainingGroup>) => {
    onChange(groups.map((g, i) => i === idx ? { ...g, ...patch } : g));
  };
  const removeGroup = (idx: number) => onChange(groups.filter((_, i) => i !== idx));
  const addGroup = (label = '新分组') => {
    onChange([
      ...groups,
      { id: `g-${Date.now()}`, label, images: [] },
    ]);
  };
  // Quick-add buttons that seed the canonical labels with zero effort.
  const addPreset = (labels: string[]) => {
    const existing = new Set(groups.map(g => g.label.trim().toLowerCase()));
    const next = [...groups];
    for (const label of labels) {
      if (existing.has(label.trim().toLowerCase())) continue;
      next.push({ id: `g-${Date.now()}-${label}`, label, images: [] });
    }
    onChange(next);
  };

  const updateImg = (gi: number, ii: number, patch: Partial<DiseaseImage>) => {
    const next = groups.map((g, i) => {
      if (i !== gi) return g;
      return { ...g, images: g.images.map((img, j) => j === ii ? { ...img, ...patch } : img) };
    });
    onChange(next);
  };
  const removeImg = (gi: number, ii: number) => {
    const next = groups.map((g, i) => {
      if (i !== gi) return g;
      return { ...g, images: g.images.filter((_, j) => j !== ii) };
    });
    onChange(next);
  };
  const addImg = (gi: number) => {
    const next = groups.map((g, i) => {
      if (i !== gi) return g;
      return { ...g, images: [...g.images, { url: '', caption: '' }] };
    });
    onChange(next);
  };

  const uploadFile = async (file: File, field: 'url' | 'fullUrl', gi: number, ii: number, scopeLabel: string) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('scope', `markers/${markerId}/${scopeLabel.replace(/[^a-zA-Z0-9+_-]/g, '_') || 'group'}`);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '上传失败');
      // Image uploads return both `url` (thumbnail) and `fullUrl` (original);
      // auto-populate both so users only need to upload once for the full
      // 压缩图/原图 experience in the gallery.
      if (j.thumbnail && j.fullUrl) {
        updateImg(gi, ii, { url: j.url, fullUrl: j.fullUrl });
      } else {
        updateImg(gi, ii, { [field]: j.url });
      }
    } catch (e) {
      alert(`上传失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section>
      <SectionHead title="染色形态图 (按结果分组)" onAdd={() => addGroup()} onSave={onSave} busy={busy || uploading} />

      <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
        <span>快速添加常用分组：</span>
        <button
          onClick={() => addPreset(['阴性', '阳性'])}
          className="px-2 py-0.5 rounded"
          style={{ background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border)' }}
        >
          + 阴性 / 阳性
        </button>
        <button
          onClick={() => addPreset(['0', '1+', '2+', '3+'])}
          className="px-2 py-0.5 rounded"
          style={{ background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border)' }}
        >
          + 0 / 1+ / 2+ / 3+
        </button>
        <button
          onClick={() => addPreset(['弱阳', '中阳', '强阳'])}
          className="px-2 py-0.5 rounded"
          style={{ background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border)' }}
        >
          + 弱 / 中 / 强
        </button>
      </div>

      <div className="space-y-4">
        {groups.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>暂无分组，点上方快速添加或 &quot;+ 新增&quot;</p>
        )}
        {groups.map((g, gi) => (
          <div
            key={g.id}
            className="rounded-lg p-3 space-y-3"
            style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Field label="分组标签（如 阴性 / 1+）" value={g.label} onChange={v => updateGroup(gi, { label: v })} />
              <Field label="描述（可选）" value={g.description || ''} onChange={v => updateGroup(gi, { description: v })} />
              <Field label="分组 ID" value={g.id} onChange={v => updateGroup(gi, { id: v })} mono />
            </div>

            <div className="space-y-2">
              {g.images.length === 0 && (
                <div
                  className="text-[11px] text-center py-3 rounded"
                  style={{ color: 'var(--fg-muted)', border: '1px dashed var(--border)' }}
                >
                  该分组还没有图片
                </div>
              )}
              {g.images.map((img, ii) => (
                <div
                  key={ii}
                  className="rounded p-2"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px] gap-2">
                    <div className="space-y-1.5">
                      <Field label="压缩图 URL" value={img.url} onChange={v => updateImg(gi, ii, { url: v })} />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'url', gi, ii, g.label)}
                        className="text-[10px]"
                        style={{ color: 'var(--fg-muted)' }}
                      />
                      <Field label="原图 URL（可选）" value={img.fullUrl || ''} onChange={v => updateImg(gi, ii, { fullUrl: v })} />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'fullUrl', gi, ii, g.label)}
                        className="text-[10px]"
                        style={{ color: 'var(--fg-muted)' }}
                      />
                      <Field label="说明" value={img.caption} onChange={v => updateImg(gi, ii, { caption: v })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      {img.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img.url} alt="" className="w-full aspect-square object-cover rounded" style={{ border: '1px solid var(--border)' }} />
                      ) : (
                        <div className="w-full aspect-square rounded flex items-center justify-center text-[9px]" style={{ border: '1px dashed var(--border)', color: 'var(--fg-muted)' }}>
                          无预览
                        </div>
                      )}
                      <button
                        onClick={() => removeImg(gi, ii)}
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => addImg(gi)}
                  className="text-[11px] px-2 py-1 rounded"
                  style={{ background: 'var(--card)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                >
                  + 添加图片到 {g.label}
                </button>
                <button
                  onClick={() => removeGroup(gi)}
                  className="text-[11px] px-2 py-1 rounded"
                  style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
                >
                  删除整组
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PdfUploadButton({
  scope,
  currentUrl,
  onUploaded,
}: {
  scope: string;
  currentUrl?: string;
  onUploaded: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    // Allow any file, but nudge toward PDF since that's what the button
    // advertises. Non-PDF uploads just fall back to browser default handling.
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('scope', scope);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '上传失败');
      onUploaded(j.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误');
    } finally {
      setBusy(false);
    }
  };

  const isPdf = !!currentUrl && /\.pdf(\?|$)/i.test(currentUrl);
  const isUploaded = !!currentUrl && currentUrl.startsWith('/uploads/');

  return (
    <div
      className="rounded-md p-2 flex items-center gap-2 flex-wrap text-[11px]"
      style={{ background: 'var(--card)', border: '1px dashed var(--border)', color: 'var(--fg-muted)' }}
    >
      <span style={{ color: 'var(--fg)' }}>上传 PDF（替换在线阅览 URL）：</span>
      <label
        className="px-2 py-1 rounded cursor-pointer"
        style={{ background: 'var(--card-hover)', color: 'var(--accent)', border: '1px solid var(--border)' }}
      >
        {busy ? '上传中...' : '选择 PDF'}
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = '';
          }}
        />
      </label>
      {isUploaded && (
        <>
          <span className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: isPdf ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)', color: isPdf ? '#ef4444' : '#818cf8' }}>
            {isPdf ? 'PDF' : '文件'}
          </span>
          <a
            href={currentUrl}
            target="_blank"
            rel="noreferrer"
            className="underline"
            style={{ color: 'var(--accent)' }}
          >
            预览 ↗
          </a>
        </>
      )}
      {error && <span style={{ color: '#ef4444' }}>上传失败：{error}</span>}
    </div>
  );
}

// ── Primitive inputs ──────────────────────────────────────────────

function Field({ label, value, onChange, span, mono, placeholder }: { label: string; value: string; onChange: (v: string) => void; span?: number; mono?: boolean; placeholder?: string }) {
  return (
    <label className={`block text-[11px] ${span === 3 ? 'sm:col-span-3' : span === 2 ? 'sm:col-span-2' : ''}`} style={{ color: 'var(--fg-muted)' }}>
      <span>{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`mt-1 w-full px-2.5 py-1.5 rounded-md outline-none text-xs ${mono ? 'font-mono' : ''}`}
        style={{ background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)' }}
      />
    </label>
  );
}

function TextareaField({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block text-[11px]" style={{ color: 'var(--fg-muted)' }}>
      <span>{label}</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows ?? 3}
        className="mt-1 w-full px-2.5 py-1.5 rounded-md outline-none text-xs leading-relaxed"
        style={{ background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)', resize: 'vertical' }}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="block text-[11px]" style={{ color: 'var(--fg-muted)' }}>
      <span>{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full px-2.5 py-1.5 rounded-md outline-none text-xs"
        style={{ background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)' }}
      >
        {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </label>
  );
}

/**
 * Generic editor for a simple array of strings — rendered as chips with an
 * inline "add" input. Used for aliases, keyFeatures, differentialDiagnosis,
 * positiveIn, negativeIn, relatedDrugs, and references.
 */
function StringArrayEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const commit = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft('');
  };
  return (
    <div>
      <div className="text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>{label}</div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {items.length === 0 && (
          <span className="text-[10px]" style={{ color: 'var(--fg-muted)', opacity: 0.6 }}>（空）</span>
        )}
        {items.map((v, i) => (
          <span
            key={i}
            className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1.5"
            style={{ background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border)' }}
          >
            <span>{v}</span>
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-[10px] leading-none"
              style={{ color: '#ef4444' }}
              aria-label="删除"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
          placeholder={placeholder || '输入后回车添加'}
          className="flex-1 px-2 py-1 rounded text-[11px] outline-none"
          style={{ background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)' }}
        />
        <button
          onClick={commit}
          className="text-[10px] px-2 py-1 rounded"
          style={{ background: 'var(--card-hover)', color: 'var(--accent)', border: '1px solid var(--border)' }}
        >
          添加
        </button>
      </div>
    </div>
  );
}

/**
 * Structured editor for disease.ihcProfile — an array of { marker, result, note }.
 * Laid out as mini-rows so admins don't have to edit JSON by hand.
 */
function IhcProfileEditor({
  items,
  onChange,
}: {
  items: IhcRow[];
  onChange: (next: IhcRow[]) => void;
}) {
  const update = (idx: number, patch: Partial<IhcRow>) => {
    onChange(items.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, { marker: '', result: '', note: '' }]);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>免疫组化谱 (marker / result / note)</div>
        <button
          onClick={add}
          className="text-[10px] px-2 py-1 rounded"
          style={{ background: 'var(--card-hover)', color: 'var(--accent)', border: '1px solid var(--border)' }}
        >
          + 新增一行
        </button>
      </div>
      <div className="space-y-1.5">
        {items.length === 0 && (
          <p className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>暂无，可点击右上角添加</p>
        )}
        {items.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_1fr_2fr_auto] gap-1.5 items-center"
          >
            <input
              value={r.marker}
              onChange={e => update(i, { marker: e.target.value })}
              placeholder="标记物 (e.g. TTF-1)"
              className="px-2 py-1 rounded text-[11px] outline-none font-mono"
              style={{ background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)' }}
            />
            <input
              value={r.result}
              onChange={e => update(i, { result: e.target.value })}
              placeholder="结果 (阳性/阴性/1+)"
              className="px-2 py-1 rounded text-[11px] outline-none"
              style={{ background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)' }}
            />
            <input
              value={r.note}
              onChange={e => update(i, { note: e.target.value })}
              placeholder="备注"
              className="px-2 py-1 rounded text-[11px] outline-none"
              style={{ background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)' }}
            />
            <button
              onClick={() => remove(i)}
              className="text-[10px] px-1.5 py-1 rounded"
              style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
            >
              删除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
