'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconBookOpen, IconSearch } from '@/components/Icon';
import { OrganIcon } from '@/components/OrganIcon';
import { CONTENT_SCHEMAS } from './contentSchemas';
import { FormRenderer } from './FormRenderer';
import { FlowchartEditor } from './FlowchartEditor';
import { ReportTemplateEditor } from './ReportTemplateEditor';
import { EntityRefArraySelector, EntityRefSelector } from './EntityRefSelector';

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
interface StainRow { stain: string; result: string; note: string }
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
  specialStainProfile?: StainRow[];
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
interface CompanionDiagnostic {
  drug: string;
  indication: string;
  positivityCriterion?: string;
  regulatoryStatus?: string;
  line?: string;
  clone?: string;
  note?: string;
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
  companionDiagnostics?: CompanionDiagnostic[];
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

type EntityKind =
  | 'disease'
  | 'marker'
  | 'basic-dict'          // 基础字典维护：器官系统 / 术语词汇表
  | 'differentials-group' // 鉴别诊断：鉴别场景 / 鉴别流程图
  | 'specialty-dx'        // 专科诊断：细胞病理学 / 分子病理 / 冰冻切片 / 取材规范
  | 'grading-reports'     // 分级与报告：分级分期系统 / CAP 报告模板
  | 'learning-tools';     // 学习工具：虚拟病例

/** Non-disease/non-marker modules managed via the generic content API */
export const CONTENT_MODULES = [
  { key: 'organs', label: '器官系统' },
  { key: 'differentials', label: '鉴别场景' },
  { key: 'flowcharts', label: '鉴别流程图' },
  { key: 'staging', label: '分级分期系统' },
  { key: 'cases', label: '虚拟病例' },
  { key: 'cytology', label: '细胞病理学' },
  { key: 'frozen-sections', label: '冰冻切片' },
  { key: 'glossary', label: '术语词汇表' },
  { key: 'grossing', label: '取材规范' },
  { key: 'molecular', label: '分子病理' },
  { key: 'reports', label: 'CAP 报告模板' },
  // 'special-stains' is now managed under the marker tab as a sub-category
] as const;

export type ContentModule = (typeof CONTENT_MODULES)[number]['key'];

/** Top-level kind → allowed modules + default module */
const CONTENT_CATEGORY_MAP: Record<string, { label: string; modules: readonly ContentModule[] }> = {
  'basic-dict':          { label: '基础字典维护', modules: ['organs', 'glossary'] },
  'differentials-group': { label: '鉴别诊断',     modules: ['differentials', 'flowcharts'] },
  'specialty-dx':        { label: '专科诊断',     modules: ['cytology', 'molecular', 'frozen-sections', 'grossing'] },
  'grading-reports':     { label: '分级与报告',   modules: ['staging', 'reports'] },
  'learning-tools':      { label: '学习工具',     modules: ['cases'] },
};

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
    specialStainProfile: [],
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
    companionDiagnostics: [],
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
  // Marker sub-category: IHC markers vs special stains (both are marker-like)
  const [markerSubtype, setMarkerSubtype] = useState<'ihc' | 'special-stain'>('ihc');
  const [specialStains, setSpecialStains] = useState<Record<string, unknown>[]>([]);
  const [stainFormValue, setStainFormValue] = useState<Record<string, unknown>>({});
  const [stainEditMode, setStainEditMode] = useState<'form' | 'json'>('form');
  const [stainJsonText, setStainJsonText] = useState('');
  const [stainError, setStainError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/all-diseases').then(r => r.json()),
      fetch('/api/markers').then(r => r.json()),
      fetch('/api/organs').then(r => r.json()),
      fetch('/api/special-stains').then(r => r.json()),
    ]).then(([d, m, o, s]) => {
      setDiseases(Array.isArray(d) ? d : []);
      setMarkers(Array.isArray(m) ? m : []);
      setOrgans(Array.isArray(o) ? o : []);
      setSpecialStains(Array.isArray(s) ? s : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const refreshSpecialStains = useCallback(async () => {
    const fresh = await fetch('/api/admin/content/special-stains', { cache: 'no-store' }).then(r => r.json());
    setSpecialStains(Array.isArray(fresh) ? fresh : []);
  }, []);

  const list = kind === 'disease' ? diseases
    : kind === 'marker' && markerSubtype === 'special-stain' ? (specialStains as unknown as MarkerLike[])
    : markers;

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
          {!currentEmail && (
            <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
              dev 模式（未启用鉴权）
            </span>
          )}
        </div>
      </div>

      {/* Entity-kind switch (7 top-level categories) */}
      <div className="flex gap-1 mb-4 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
        {(['disease', 'marker', 'basic-dict', 'differentials-group', 'specialty-dx', 'grading-reports', 'learning-tools'] as EntityKind[]).map(k => {
          const label = k === 'disease' ? `疾病 (${diseases.length})`
            : k === 'marker' ? `标记物 (${markers.length})`
            : CONTENT_CATEGORY_MAP[k]?.label || k;
          return (
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
              className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0"
              style={{
                borderBottomColor: kind === k ? 'var(--accent)' : 'transparent',
                color: kind === k ? 'var(--fg)' : 'var(--fg-muted)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {CONTENT_CATEGORY_MAP[kind] && (
        <ContentManager showToast={showToast} allowedModules={CONTENT_CATEGORY_MAP[kind].modules} />
      )}

      {/* Marker sub-category: IHC / Special stains */}
      {kind === 'marker' && (
        <div className="flex gap-1 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          {(['ihc', 'special-stain'] as const).map(s => (
            <button
              key={s}
              onClick={() => { setMarkerSubtype(s); setSelected(null); setStainFormValue({}); setStainError(null); }}
              className="px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer"
              style={{
                borderBottomColor: markerSubtype === s ? 'var(--accent)' : 'transparent',
                color: markerSubtype === s ? 'var(--fg)' : 'var(--fg-muted)',
              }}
            >
              {s === 'ihc' ? `免疫组化 (${markers.length})` : `特殊染色 (${specialStains.length})`}
            </button>
          ))}
        </div>
      )}

      {(kind === 'disease' || kind === 'marker') && (
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:h-[calc(100vh-14rem)]">
        {/* List panel */}
        <aside
          className="rounded-xl p-3 lg:overflow-y-auto"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
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
        <main className="rounded-xl p-5 lg:overflow-y-auto" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
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
          {kind === 'marker' && markerSubtype === 'ihc' && selectedMarker && (
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
          {kind === 'marker' && markerSubtype === 'special-stain' && selected && (
            <SpecialStainEditor
              key={selected}
              stainId={selected === NEW_SENTINEL ? '' : selected}
              isNew={isCreating}
              existing={selected === NEW_SENTINEL ? null : specialStains.find(s => s.id === selected) || null}
              formValue={stainFormValue}
              setFormValue={setStainFormValue}
              editMode={stainEditMode}
              setEditMode={setStainEditMode}
              jsonText={stainJsonText}
              setJsonText={setStainJsonText}
              error={stainError}
              setError={setStainError}
              onSaved={async (msg) => {
                await refreshSpecialStains();
                showToast(msg);
              }}
              onCreated={async (id) => {
                await refreshSpecialStains();
                setSelected(id);
                showToast(`已创建：${id}`);
              }}
              onDeleted={async () => {
                await refreshSpecialStains();
                setSelected(null);
              }}
            />
          )}
        </main>
      </div>
      )}

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
    specialStainProfile: d.specialStainProfile || [],
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
        <SpecialStainProfileEditor
          items={draft.specialStainProfile || []}
          onChange={v => patch('specialStainProfile', v)}
        />
        <EntityRefArraySelector
          entityType="disease"
          label="鉴别诊断"
          values={draft.differentialDiagnosis || []}
          onChange={v => patch('differentialDiagnosis', v)}
          placeholder="搜索中文名 / 英文名 / ID 添加需鉴别疾病..."
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
    companionDiagnostics: m.companionDiagnostics || [],
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

      <CompanionDiagnosticsEditor
        items={draft.companionDiagnostics || []}
        onChange={v => patch('companionDiagnostics', v)}
      />

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
 * CompanionDiagnostics editor — row-based form for clinical CDx entries.
 * Each row: drug / indication / positivityCriterion / regulatoryStatus / line / clone / note.
 */
function CompanionDiagnosticsEditor({
  items,
  onChange,
}: {
  items: CompanionDiagnostic[];
  onChange: (next: CompanionDiagnostic[]) => void;
}) {
  const updateRow = (i: number, patch: Partial<CompanionDiagnostic>) => {
    onChange(items.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const removeRow = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const addRow = () => onChange([...items, { drug: '', indication: '' }]);
  const moveRow = (i: number, dir: -1 | 1) => {
    const next = [...items];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    onChange(next);
  };

  const STATUS_OPTIONS = ['FDA+NMPA', 'FDA', 'NMPA', 'EMA', '实验性', ''];
  const LINE_OPTIONS = ['一线', '二线', '三线', '二/三线', '辅助', '新辅助', '辅助/新辅助', '维持', '挽救', ''];

  return (
    <section className="rounded-lg p-4 space-y-3" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
          伴随诊断 (Companion Diagnostics) · {items.length} 条
        </h3>
        <button
          onClick={addRow}
          className="text-xs px-2 py-1 rounded-md cursor-pointer"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          + 新增一条
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-center py-3" style={{ color: 'var(--fg-muted)' }}>暂无 CDx 条目，点击上方按钮新增</p>
      ) : (
        <div className="space-y-2">
          {items.map((row, i) => (
            <div
              key={i}
              className="rounded-lg p-3"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold" style={{ color: 'var(--fg-muted)' }}>#{i + 1}</span>
                <div className="flex gap-0.5">
                  <button onClick={() => moveRow(i, -1)} disabled={i === 0} className="px-1.5 py-0.5 rounded text-[10px] cursor-pointer"
                    style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)', border: '1px solid var(--border)', opacity: i === 0 ? 0.4 : 1 }}>↑</button>
                  <button onClick={() => moveRow(i, 1)} disabled={i === items.length - 1} className="px-1.5 py-0.5 rounded text-[10px] cursor-pointer"
                    style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)', border: '1px solid var(--border)', opacity: i === items.length - 1 ? 0.4 : 1 }}>↓</button>
                  <button onClick={() => removeRow(i)} className="px-2 py-0.5 rounded text-[10px] cursor-pointer"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>删除</button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <CdxField label="药物 *" value={row.drug} onChange={v => updateRow(i, { drug: v })} placeholder="曲妥珠单抗 (Trastuzumab)" />
                <CdxField label="适应证 *" value={row.indication} onChange={v => updateRow(i, { indication: v })} placeholder="HER2+ 乳腺癌 / 胃癌" />
                <CdxField label="阳性判读标准" value={row.positivityCriterion || ''} onChange={v => updateRow(i, { positivityCriterion: v })} placeholder="IHC 3+ 或 FISH 扩增" />
                <CdxField label="IHC 克隆号（可选）" value={row.clone || ''} onChange={v => updateRow(i, { clone: v })} placeholder="22C3 / SP142 / SP263" />
                <CdxSelect label="监管状态" value={row.regulatoryStatus || ''} onChange={v => updateRow(i, { regulatoryStatus: v })} options={STATUS_OPTIONS} />
                <CdxSelect label="治疗线" value={row.line || ''} onChange={v => updateRow(i, { line: v })} options={LINE_OPTIONS} />
                <div className="sm:col-span-2">
                  <CdxField label="备注" value={row.note || ''} onChange={v => updateRow(i, { note: v })} placeholder="补充说明" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CdxField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[10px] mb-0.5" style={{ color: 'var(--fg-muted)' }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 rounded text-xs outline-none"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }}
      />
    </div>
  );
}

function CdxSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-[10px] mb-0.5" style={{ color: 'var(--fg-muted)' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded text-xs outline-none"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }}
      >
        <option value="">-- 选择 --</option>
        {options.filter(o => o).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
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

/**
 * Structured editor for disease.specialStainProfile — same shape as IHC but
 * field is `stain` instead of `marker`.
 */
function SpecialStainProfileEditor({
  items,
  onChange,
}: {
  items: StainRow[];
  onChange: (next: StainRow[]) => void;
}) {
  const update = (idx: number, patch: Partial<StainRow>) => {
    onChange(items.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, { stain: '', result: '', note: '' }]);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
          特殊染色谱 (stain / result / note)
        </div>
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
          <div key={i} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-1.5 items-center">
            <input
              value={r.stain}
              onChange={e => update(i, { stain: e.target.value })}
              placeholder="染色方法 (e.g. PAS / Masson)"
              className="px-2 py-1 rounded text-[11px] outline-none font-mono"
              style={{ background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)' }}
            />
            <input
              value={r.result}
              onChange={e => update(i, { result: e.target.value })}
              placeholder="结果 (阳性/蓝染/...)"
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

// ── ContentManager: generic admin UI for non-disease/non-marker modules ──

function ContentManager({
  showToast,
  allowedModules,
}: {
  showToast: (msg: string) => void;
  allowedModules?: readonly ContentModule[];
}) {
  const filteredModules = useMemo(
    () => (allowedModules ? CONTENT_MODULES.filter(m => allowedModules.includes(m.key)) : CONTENT_MODULES),
    [allowedModules],
  );
  const defaultModule = filteredModules[0]?.key || 'organs';
  const [module, setModule] = useState<ContentModule>(defaultModule);

  // If allowedModules changes (category switch at parent), reset to first allowed
  useEffect(() => {
    if (allowedModules && !allowedModules.includes(module)) {
      setModule(defaultModule);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedModules]);
  const [entries, setEntries] = useState<Record<string, unknown>[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editText, setEditText] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [newId, setNewId] = useState('');
  const [editMode, setEditMode] = useState<'form' | 'json'>('form');
  const [formValue, setFormValue] = useState<Record<string, unknown>>({});
  const schema = CONTENT_SCHEMAS[module];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch(`/api/admin/content/${module}`, { cache: 'no-store' }).then(r => r.json());
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [module]);

  useEffect(() => {
    load();
    setSelectedId(null);
    setEditText('');
    setEditError(null);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e => {
      const id = String(e.id || '');
      const name = String(e.nameZh || e.titleZh || e.termZh || e.titleEn || e.nameEn || e.termEn || '');
      return id.toLowerCase().includes(q) || name.toLowerCase().includes(q);
    });
  }, [entries, search]);

  const selectEntry = (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (entry) {
      setSelectedId(id);
      setEditText(JSON.stringify(entry, null, 2));
      setFormValue({ ...entry });
      setEditError(null);
    }
  };

  const switchMode = (next: 'form' | 'json') => {
    if (next === editMode) return;
    if (next === 'json') {
      // form → json: serialize current form value
      setEditText(JSON.stringify({ ...formValue, id: selectedId }, null, 2));
    } else {
      // json → form: parse current text
      try {
        const parsed = JSON.parse(editText);
        setFormValue(parsed);
        setEditError(null);
      } catch {
        setEditError('当前 JSON 不合法，无法切换到表单模式');
        return;
      }
    }
    setEditMode(next);
  };

  const saveEntry = async () => {
    if (!selectedId) return;
    let parsed: Record<string, unknown>;
    if (editMode === 'form') {
      parsed = { ...formValue, id: selectedId };
    } else {
      try {
        parsed = JSON.parse(editText);
      } catch (e) {
        setEditError(`JSON 解析失败：${e instanceof Error ? e.message : '未知错误'}`);
        return;
      }
      if (!parsed.id || parsed.id !== selectedId) {
        setEditError(`id 不可修改（必须为 "${selectedId}"）`);
        return;
      }
    }
    try {
      const res = await fetch(`/api/admin/content/${module}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId, updates: parsed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setEditError(err.error || '保存失败');
        return;
      }
      await load();
      showToast(`已保存：${selectedId}`);
      setEditError(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : '保存出错');
    }
  };

  const deleteEntry = async () => {
    if (!selectedId) return;
    if (!confirm(`确定删除 "${selectedId}"？此操作无法撤销。`)) return;
    try {
      const res = await fetch(`/api/admin/content/${module}?id=${encodeURIComponent(selectedId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || '删除失败');
        return;
      }
      await load();
      setSelectedId(null);
      setEditText('');
      showToast(`已删除：${selectedId}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '删除出错');
    }
  };

  const createEntry = async () => {
    const id = newId.trim();
    if (!id) return;
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(id)) {
      showToast('id 格式非法：仅允许字母数字和连字符');
      return;
    }
    if (entries.some(e => e.id === id)) {
      showToast(`id 已存在：${id}`);
      return;
    }
    try {
      const res = await fetch(`/api/admin/content/${module}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry: { id } }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || '创建失败');
        return;
      }
      await load();
      setNewId('');
      showToast(`已创建：${id}`);
      // Auto-select the new entry for editing
      setTimeout(() => selectEntry(id), 100);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '创建出错');
    }
  };

  const selectedEntry = selectedId ? entries.find(e => e.id === selectedId) : null;

  return (
    <div>
      {/* Module selector — always shown for 二级菜单一致性 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {filteredModules.map(m => (
          <button
            key={m.key}
            onClick={() => setModule(m.key)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 flex items-center gap-1.5"
            style={{
              background: module === m.key ? 'var(--accent)' : 'var(--card)',
              color: module === m.key ? '#fff' : 'var(--fg-muted)',
              border: `1px solid ${module === m.key ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            <span>{m.label}</span>
            {module === m.key && (
              <span className="tabular-nums text-[10px] px-1.5 py-px rounded-full" style={{ background: 'rgba(255,255,255,0.22)' }}>
                {entries.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 lg:h-[calc(100vh-18rem)]">
        {/* Left: entry list */}
        <aside
          className="rounded-xl p-3 lg:overflow-y-auto"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {/* Create new */}
          <div className="flex gap-1 mb-3">
            <input
              type="text"
              placeholder="新 ID（如：new-item）"
              value={newId}
              onChange={e => setNewId(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createEntry(); }}
              className="flex-1 px-2 py-1.5 rounded text-xs outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            />
            <button
              onClick={createEntry}
              disabled={!newId.trim()}
              className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
              style={{ background: 'var(--accent)', color: '#fff', opacity: newId.trim() ? 1 : 0.4 }}
            >
              + 新增
            </button>
          </div>

          <input
            type="text"
            placeholder="搜索..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-2 py-1.5 rounded text-xs outline-none mb-2"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          />

          {loading ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--fg-muted)' }}>加载中...</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--fg-muted)' }}>
              {entries.length === 0 ? '暂无条目' : '无匹配结果'}
            </p>
          ) : (
            <ul className="max-h-[500px] overflow-y-auto space-y-0.5">
              {filtered.map(e => {
                const id = String(e.id);
                const name = String(e.nameZh || e.titleZh || e.termZh || e.nameEn || e.titleEn || e.termEn || id);
                const enName = String(e.nameEn || e.titleEn || e.termEn || '');
                const subtitle = enName || id;
                const subtitleIsEn = !!enName;
                const organColor = module === 'organs' ? String(e.color || 'var(--accent)') : undefined;
                return (
                  <li key={id}>
                    <button
                      onClick={() => selectEntry(id)}
                      className="w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center gap-2"
                      style={{
                        background: selectedId === id ? 'var(--accent)' : 'transparent',
                        color: selectedId === id ? '#fff' : 'var(--fg)',
                      }}
                      title={id}
                    >
                      {module === 'organs' && (
                        <OrganIcon organId={id} size={20} color={selectedId === id ? '#fff' : organColor} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{name}</div>
                        <div className={`text-[10px] truncate ${subtitleIsEn ? '' : 'font-mono'}`} style={{ opacity: 0.7 }}>
                          {subtitle}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Right: JSON editor */}
        <main className="rounded-xl p-4 lg:overflow-y-auto" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {!selectedEntry ? (
            <div className="text-center py-16" style={{ color: 'var(--fg-muted)' }}>
              <p className="text-sm mb-2">选择左侧条目以编辑</p>
              <p className="text-xs">或输入新 ID 创建条目</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  {module === 'organs' && (
                    <OrganIcon
                      organId={String(selectedEntry.id)}
                      size={32}
                      color={String(selectedEntry.color || 'var(--accent)')}
                    />
                  )}
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                      {String(selectedEntry.nameZh || selectedEntry.titleZh || selectedEntry.termZh || selectedEntry.id)}
                    </div>
                    {(() => {
                      const enName = String(selectedEntry.nameEn || selectedEntry.titleEn || selectedEntry.termEn || '');
                      return (
                        <div className="flex items-center gap-2 mt-0.5">
                          {enName && (
                            <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{enName}</span>
                          )}
                          <code className="text-[10px]" style={{ color: 'var(--fg-muted)', opacity: 0.7 }}>{String(selectedEntry.id)}</code>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveEntry}
                    className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    保存
                  </button>
                  <button
                    onClick={deleteEntry}
                    className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                  >
                    删除
                  </button>
                </div>
              </div>

              {editError && (
                <div className="rounded-lg p-2.5 mb-2 text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                  {editError}
                </div>
              )}

              {/* Edit mode toggle */}
              <div className="flex gap-1 mb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                {(['form', 'json'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    disabled={m === 'form' && !schema}
                    className="px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer"
                    style={{
                      borderBottomColor: editMode === m ? 'var(--accent)' : 'transparent',
                      color: editMode === m ? 'var(--fg)' : 'var(--fg-muted)',
                      opacity: m === 'form' && !schema ? 0.4 : 1,
                    }}
                  >
                    {m === 'form' ? '表单编辑' : 'JSON 原始'}
                  </button>
                ))}
              </div>

              {editMode === 'form' && schema ? (
                module === 'flowcharts' ? (
                  <div>
                    {/* Title + related id editing before visual canvas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg)' }}>标题</label>
                        <input
                          type="text"
                          value={(formValue.titleZh as string) || ''}
                          onChange={e => setFormValue({ ...formValue, titleZh: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg)' }}>关联鉴别场景 ID</label>
                        <input
                          type="text"
                          value={(formValue.relatedDifferentialId as string) || ''}
                          onChange={e => setFormValue({ ...formValue, relatedDifferentialId: e.target.value })}
                          placeholder="引用 differentials.json 中的 id"
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                        />
                      </div>
                    </div>
                    <FlowchartEditor
                      value={formValue as { nodes: any[]; edges: any[]; [k: string]: unknown }}
                      onChange={(v) => setFormValue({ ...formValue, nodes: v.nodes, edges: v.edges })}
                    />
                  </div>
                ) : module === 'reports' ? (
                  <ReportTemplateEditor
                    value={formValue as { id: string; sections: any[]; [k: string]: unknown }}
                    onChange={setFormValue}
                  />
                ) : (
                  <FormRenderer schema={schema} value={formValue} onChange={setFormValue} />
                )
              ) : (
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="w-full rounded-lg p-3 text-xs font-mono outline-none"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--fg)',
                    minHeight: 500,
                    resize: 'vertical',
                    tabSize: 2,
                  }}
                  spellCheck={false}
                />
              )}

              <p className="text-[10px] mt-2" style={{ color: 'var(--fg-muted)' }}>
                {editMode === 'form' ? '表单模式：按字段编辑。' : '原始模式：直接编辑 JSON。'}id 字段不可修改。保存后将触发页面缓存刷新。
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── SpecialStainEditor: form + staining images for special stains ──

function SpecialStainEditor({
  stainId, isNew, existing,
  formValue, setFormValue,
  editMode, setEditMode,
  jsonText, setJsonText,
  error, setError,
  onSaved, onCreated, onDeleted,
}: {
  stainId: string;
  isNew: boolean;
  existing: Record<string, unknown> | null;
  formValue: Record<string, unknown>;
  setFormValue: (v: Record<string, unknown>) => void;
  editMode: 'form' | 'json';
  setEditMode: (m: 'form' | 'json') => void;
  jsonText: string;
  setJsonText: (s: string) => void;
  error: string | null;
  setError: (s: string | null) => void;
  onSaved: (msg: string) => Promise<void>;
  onCreated: (id: string) => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const schema = CONTENT_SCHEMAS['special-stains'];
  const [newIdDraft, setNewIdDraft] = useState('');
  const [busy, setBusy] = useState(false);

  // Initialize form value on mount or when existing changes
  useEffect(() => {
    if (existing) {
      setFormValue({ ...existing });
      setJsonText(JSON.stringify(existing, null, 2));
    } else if (isNew) {
      setFormValue({ id: '', nameZh: '', nameEn: '', abbreviation: '', category: '', stainingImages: [] });
      setJsonText(JSON.stringify({ id: '', nameZh: '', nameEn: '' }, null, 2));
    }
    setError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, isNew]);

  const switchMode = (next: 'form' | 'json') => {
    if (next === editMode) return;
    if (next === 'json') {
      setJsonText(JSON.stringify(formValue, null, 2));
    } else {
      try {
        setFormValue(JSON.parse(jsonText));
        setError(null);
      } catch {
        setError('JSON 不合法');
        return;
      }
    }
    setEditMode(next);
  };

  const buildPayload = (): Record<string, unknown> | null => {
    if (editMode === 'form') return formValue;
    try {
      return JSON.parse(jsonText);
    } catch (e) {
      setError(`JSON 解析失败：${e instanceof Error ? e.message : '未知错误'}`);
      return null;
    }
  };

  const create = async () => {
    const id = newIdDraft.trim();
    if (!id || !/^[a-z0-9][a-z0-9-]*$/i.test(id)) {
      setError('ID 格式非法：仅允许字母数字和连字符');
      return;
    }
    setBusy(true);
    try {
      const payload = buildPayload();
      if (!payload) return;
      const entry = { ...payload, id };
      const res = await fetch('/api/admin/content/special-stains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error || '创建失败'); return; }
      await onCreated(id);
      setError(null);
    } finally { setBusy(false); }
  };

  const save = async (updates?: Record<string, unknown>, msg = '已保存') => {
    if (!stainId) return;
    const payload = updates || buildPayload();
    if (!payload) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/content/special-stains', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: stainId, updates: payload }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error || '保存失败'); return; }
      await onSaved(msg);
      setError(null);
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!stainId) return;
    if (!confirm(`确定删除 "${stainId}"？`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/content/special-stains?id=${encodeURIComponent(stainId)}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || '删除失败');
        return;
      }
      await onDeleted();
    } finally { setBusy(false); }
  };

  const patch = (key: string, value: unknown) => {
    setFormValue({ ...formValue, [key]: value });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
            {isNew ? '新建特殊染色' : String(formValue.nameZh || stainId)}
          </div>
          {!isNew && <code className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>{stainId}</code>}
        </div>
        <div className="flex gap-2">
          {isNew ? (
            <>
              <input
                type="text"
                placeholder="ID（如：gram-stain）"
                value={newIdDraft}
                onChange={e => setNewIdDraft(e.target.value)}
                className="px-2 py-1 rounded text-xs outline-none font-mono"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)', minWidth: 160 }}
              />
              <button
                onClick={create}
                disabled={busy || !newIdDraft.trim()}
                className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
                style={{ background: 'var(--accent)', color: '#fff', opacity: newIdDraft.trim() && !busy ? 1 : 0.4 }}
              >
                创建
              </button>
            </>
          ) : (
            <>
              <button onClick={() => save()} disabled={busy} className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer" style={{ background: 'var(--accent)', color: '#fff' }}>
                保存
              </button>
              <button onClick={remove} disabled={busy} className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                删除
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg p-2.5 mb-3 text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
          {error}
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-1 mb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        {(['form', 'json'] as const).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className="px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer"
            style={{
              borderBottomColor: editMode === m ? 'var(--accent)' : 'transparent',
              color: editMode === m ? 'var(--fg)' : 'var(--fg-muted)',
            }}
          >
            {m === 'form' ? '表单编辑' : 'JSON 原始'}
          </button>
        ))}
      </div>

      {editMode === 'form' ? (
        <FormRenderer schema={schema} value={formValue} onChange={setFormValue} />
      ) : (
        <textarea
          value={jsonText}
          onChange={e => setJsonText(e.target.value)}
          className="w-full rounded-lg p-3 text-xs font-mono outline-none"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)', minHeight: 500, resize: 'vertical' }}
          spellCheck={false}
        />
      )}

      {/* Staining images — only in form mode, only when editing existing */}
      {!isNew && editMode === 'form' && (
        <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg)' }}>染色图库</h3>
          <StainingGroupsEditor
            markerId={`stains/${stainId}`}
            groups={(formValue.stainingImages as StainingGroup[]) || []}
            onChange={v => patch('stainingImages', v)}
            onSave={() => save({ stainingImages: (formValue.stainingImages as StainingGroup[]) || [] }, '染色图已保存')}
            busy={busy}
          />
        </div>
      )}
    </div>
  );
}
