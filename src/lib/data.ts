import fs from 'fs';
import path from 'path';
import { getDataDir } from './dataDir';

// ── Types ─────────────────────────────────────────────────────────

/**
 * A pathology figure. `url` is always the thumbnail/compressed preview that
 * the atlas displays by default. `fullUrl` is optional — if present, the UI
 * exposes a "加载原图" button that swaps in the high-resolution source
 * on demand so the page stays lightweight on first paint.
 * `source` optionally records the human-readable origin (e.g. "Wikimedia
 * Commons") for attribution.
 */
export interface DiseaseImage {
  url: string;
  fullUrl?: string;
  caption: string;
  source?: string;
}

/**
 * An expert consensus / guideline entry referenced by a disease or marker.
 * `sourceUrl` is the original publisher page (e.g. NCCN / WHO / CSCO),
 * `viewUrl` is an embeddable online viewer (can be the same as sourceUrl
 * or a PDF hosted at public/uploads). Both are optional so entries can be
 * progressively enriched.
 */
export interface ConsensusItem {
  id: string;
  title: string;
  summary: string;
  organization?: string;
  year?: number;
  sourceUrl?: string;
  viewUrl?: string;
}

/** A literature/paper citation with optional links for fetching or preview. */
export interface LiteratureItem {
  id: string;
  title: string;
  summary: string;
  authors?: string;
  journal?: string;
  year?: number;
  sourceUrl?: string;
  viewUrl?: string;
}

/**
 * A labelled group of staining micrographs for a single marker. Typical
 * result labels include "阴性" / "阳性" for binary markers and "0" /
 * "1+" / "2+" / "3+" for semi-quantitative markers (e.g. HER2). Groups are
 * intentionally stored as an ordered array instead of a record so the UI
 * can render the canonical clinical order and so custom labels such as
 * "灶性阳性" or "强阳 (>75%)" are allowed.
 */
export interface MarkerStainingGroup {
  id: string;
  label: string;
  description?: string;
  images: DiseaseImage[];
}

export interface Disease {
  id: string;
  nameZh: string;
  nameEn: string;
  aliases: string[];
  organ: string;
  category: 'benign' | 'malignant' | 'precancerous' | 'inflammatory' | 'other';
  epidemiology: string;
  clinicalFeatures: string;
  grossPathology: string;
  grossDescription?: string;
  microscopy: string;
  keyFeatures: string[];
  ihcProfile: { marker: string; result: string; note: string }[];
  specialStainProfile?: { stain: string; result: string; note: string }[];
  molecularFeatures: string;
  differentialDiagnosis: string[];
  /** Markdown 鉴别要点：哪些形态/免疫组化/分子线索可用于把本病和 differentialDiagnosis 里的条目区分开 */
  differentialDiagnosisNotes?: string;
  grading: string;
  staging: string;
  prognosis: string;
  treatment: string;
  /** Legacy generic image list (retained for back-compat with older entries). */
  images: DiseaseImage[];
  /** Real H&E / IHC micrographs for the 镜下特征 tab. */
  microscopyImages?: DiseaseImage[];
  /** Real gross photos / macroscopy images for the 大体描述 tab. */
  grossImages?: DiseaseImage[];
  /** Guideline / expert consensus entries shown in the 专家共识 tab. */
  expertConsensus?: ConsensusItem[];
  /** Journal article / paper references shown in the 文献参考 tab. */
  literature?: LiteratureItem[];
  references: string[];
}

export interface Organ {
  id: string;
  nameZh: string;
  nameEn: string;
  icon: string;
  color: string;
  description: string;
  commonStains: string[];
  keyPatterns: string[];
}

/**
 * Companion diagnostic entry: maps an IHC/molecular biomarker to its
 * associated targeted therapy, approved indication and regulatory status.
 * Used on marker detail pages to show the clinical action-ability of a
 * positive test result.
 */
export interface CompanionDiagnostic {
  drug: string;                    // e.g. "曲妥珠单抗 (Trastuzumab)"
  indication: string;              // e.g. "HER2+乳腺癌/胃癌"
  positivityCriterion?: string;    // e.g. "IHC 3+ 或 FISH 扩增"
  regulatoryStatus?: string;       // e.g. "FDA+NMPA" / "FDA" / "实验性"
  line?: string;                   // e.g. "一线" / "二/三线" / "辅助/新辅助"
  clone?: string;                  // specific IHC clone if relevant (e.g. "22C3" for pembrolizumab)
  note?: string;
}

export interface Marker {
  id: string;
  nameZh: string;
  nameEn: string;
  abbreviation: string;
  category: string;
  cloneInfo: string;
  targetProtein: string;
  cellularLocalization: string;
  normalExpression: string;
  function: string;
  interpretation: string;
  clinicalSignificance: string;
  positiveIn: string[];
  negativeIn: string[];
  relatedDrugs: string[];
  /** Structured companion diagnostics table: biomarker → drug → approval */
  companionDiagnostics?: CompanionDiagnostic[];
  pitfalls: string;
  references: string[];
  /** Guideline / expert consensus entries shown in the marker detail view. */
  expertConsensus?: ConsensusItem[];
  /** Journal article / paper references shown in the marker detail view. */
  literature?: LiteratureItem[];
  /**
   * Canonical staining micrographs grouped by result category. Each group
   * is rendered as its own sub-gallery so 0/1+/2+/3+ or negative/positive
   * slides never get mixed together.
   */
  stainingImages?: MarkerStainingGroup[];
}

export interface StagingSystem {
  id: string;
  nameZh: string;
  nameEn: string;
  applicableTo: string[];
  description: string;
  criteria: { parameter: string; score1: string; score2: string; score3: string }[];
  grades: { grade: string; totalScore: string; description: string }[];
}

export interface DifferentialScenario {
  id: string;
  titleZh: string;
  titleEn: string;
  description: string;
  diseases: string[];
  keyMarkers: string[];
  algorithm: string;
}

// ── Data Loading ──────────────────────────────────────────────────

const DATA_DIR = getDataDir();

// Tiny in-process cache so each JSON file is parsed at most once per Node worker.
// The data is mostly static, so this is safe and significantly reduces repeated
// fs.readFileSync + JSON.parse overhead across API routes and page renders.
//
// Admin mutations MUST call invalidateJsonCache() after writing to a file so
// the next read picks up the fresh content; otherwise long-lived `next start`
// processes will keep serving stale data until restart.
const jsonCache = new Map<string, unknown>();

/**
 * Drop a single file (or the entire cache) from the in-process JSON cache.
 * Call this immediately after any `fs.writeFileSync` against a data file.
 */
export function invalidateJsonCache(filePath?: string): void {
  if (filePath) {
    jsonCache.delete(filePath);
  } else {
    jsonCache.clear();
  }
}

/** Absolute path to data/diseases/<organ>.json — exported so admin routes
 *  can pass the same key to invalidateJsonCache(). */
export function getDiseaseFilePath(organ: string): string {
  return path.join(DATA_DIR, 'diseases', `${organ}.json`);
}

/** Absolute path to data/markers.json. */
export function getMarkersFilePath(): string {
  return path.join(DATA_DIR, 'markers.json');
}

function loadJson<T>(filePath: string): T {
  const cached = jsonCache.get(filePath);
  if (cached !== undefined) return cached as T;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content) as T;
    jsonCache.set(filePath, parsed);
    return parsed;
  } catch {
    return [] as unknown as T;
  }
}

export function getOrgans(): Organ[] {
  return loadJson<Organ[]>(path.join(DATA_DIR, 'organs.json'));
}

export function getOrgan(id: string): Organ | undefined {
  return getOrgans().find(o => o.id === id);
}

export function getDiseasesByOrgan(organId: string): Disease[] {
  return loadJson<Disease[]>(path.join(DATA_DIR, 'diseases', `${organId}.json`));
}

export function getDisease(organId: string, diseaseId: string): Disease | undefined {
  return getDiseasesByOrgan(organId).find(d => d.id === diseaseId);
}

export function getAllDiseases(): Disease[] {
  const organs = getOrgans();
  const all: Disease[] = [];
  for (const organ of organs) {
    all.push(...getDiseasesByOrgan(organ.id));
  }
  return all;
}

export function getMarkers(): Marker[] {
  return loadJson<Marker[]>(path.join(DATA_DIR, 'markers.json'));
}

export function getMarker(id: string): Marker | undefined {
  return getMarkers().find(m => m.id === id);
}

/**
 * Returns every marker augmented with the list of organ systems it is used
 * in. "Used in" = the marker appears in at least one disease's `ihcProfile`
 * whose owning organ matches. This is computed at runtime from the existing
 * disease database so the mapping stays in sync when new diseases/markers
 * are added — no manual curation required.
 */
export function getMarkersWithOrgans(): (Marker & { organs: string[] })[] {
  const markers = getMarkers();
  const diseases = getAllDiseases();

  // Normalizes a free-text marker label (e.g. "CK5/6", "Ki-67", "BCL-2")
  // to the canonical lowercase-dash id used in markers.json so lookups
  // survive punctuation and case differences.
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // slug → Set<organId>
  const organsBySlug = new Map<string, Set<string>>();
  for (const d of diseases) {
    for (const item of d.ihcProfile) {
      const key = slug(item.marker);
      if (!organsBySlug.has(key)) organsBySlug.set(key, new Set());
      organsBySlug.get(key)!.add(d.organ);
    }
  }

  return markers.map(m => {
    // A marker can be referenced by its id, abbreviation, or English name.
    // Try all three lookup keys to maximise matches against disease IHC rows
    // without requiring authors to use a single canonical form.
    const candidates = [m.id, slug(m.abbreviation || ''), slug(m.nameEn || '')];
    const organs = new Set<string>();
    for (const k of candidates) {
      const hit = organsBySlug.get(k);
      if (hit) for (const o of hit) organs.add(o);
    }
    return { ...m, organs: Array.from(organs).sort() };
  });
}

export function getStagingSystems(): StagingSystem[] {
  return loadJson<StagingSystem[]>(path.join(DATA_DIR, 'staging.json'));
}

export function getDifferentials(): DifferentialScenario[] {
  return loadJson<DifferentialScenario[]>(path.join(DATA_DIR, 'differentials.json'));
}

// ── Search ────────────────────────────────────────────────────────

export type SearchResultType =
  | 'disease'
  | 'marker'
  | 'differential'
  | 'glossary'
  | 'case'
  | 'staging'
  | 'cytology'
  | 'frozen'
  | 'grossing'
  | 'molecular'
  | 'special-stain';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  snippet?: string;   // Short preview with matched context
  organ?: string;
  url: string;
  score: number;
}

/**
 * Score a query match based on WHERE it hit:
 * - Title/name exact match: 100
 * - Title/name starts with: 60
 * - Title/name contains: 40
 * - Alias/abbreviation contains: 30
 * - Body text contains: 10
 */
function scoreMatch(q: string, fields: { title?: string; primaryFields?: string[]; bodyFields?: string[] }): number {
  let score = 0;
  const lq = q.toLowerCase();

  const title = (fields.title || '').toLowerCase();
  if (title === lq) score += 100;
  else if (title.startsWith(lq)) score += 60;
  else if (title.includes(lq)) score += 40;

  for (const f of fields.primaryFields || []) {
    if (f && f.toLowerCase().includes(lq)) { score += 30; break; }
  }

  for (const f of fields.bodyFields || []) {
    if (f && f.toLowerCase().includes(lq)) { score += 10; break; }
  }

  return score;
}

/** Make a short snippet around the first match in the given text. */
function makeSnippet(text: string, query: string, maxLen = 100): string | undefined {
  if (!text) return undefined;
  const lq = query.toLowerCase();
  const lt = text.toLowerCase();
  const idx = lt.indexOf(lq);
  if (idx < 0) return undefined;
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + query.length + 60);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = '…' + snippet;
  if (end < text.length) snippet = snippet + '…';
  return snippet.length > maxLen ? snippet.slice(0, maxLen) + '…' : snippet;
}

export function searchAll(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: SearchResult[] = [];

  // Diseases
  for (const d of getAllDiseases()) {
    const score = scoreMatch(q, {
      title: d.nameZh,
      primaryFields: [d.nameEn, ...(d.aliases || [])],
      bodyFields: [d.microscopy, d.clinicalFeatures, ...(d.keyFeatures || [])],
    });
    if (score > 0) {
      results.push({
        type: 'disease', id: d.id, title: d.nameZh, subtitle: d.nameEn,
        organ: d.organ, url: `/atlas/${d.organ}/${d.id}`, score,
        snippet: makeSnippet(d.microscopy, q) || makeSnippet(d.clinicalFeatures, q),
      });
    }
  }

  // Markers
  for (const m of getMarkers()) {
    const score = scoreMatch(q, {
      title: m.nameZh,
      primaryFields: [m.nameEn, m.abbreviation],
      bodyFields: [m.function, m.clinicalSignificance, ...(m.positiveIn || [])],
    });
    if (score > 0) {
      results.push({
        type: 'marker', id: m.id, title: m.abbreviation || m.nameEn, subtitle: m.nameZh,
        url: `/markers/${m.id}`, score,
        snippet: makeSnippet(m.function, q) || makeSnippet(m.clinicalSignificance, q),
      });
    }
  }

  // Differentials
  for (const d of getDifferentials()) {
    const score = scoreMatch(q, {
      title: d.titleZh,
      primaryFields: [d.titleEn],
      bodyFields: [d.description, d.algorithm, ...(d.keyMarkers || [])],
    });
    if (score > 0) {
      results.push({
        type: 'differential', id: d.id, title: d.titleZh, subtitle: d.titleEn,
        url: `/differentials#${d.id}`, score,
        snippet: makeSnippet(d.description, q) || makeSnippet(d.algorithm, q),
      });
    }
  }

  // Glossary terms
  const glossary = loadJson<any[]>(path.join(DATA_DIR, 'glossary.json'));
  for (const g of glossary) {
    const score = scoreMatch(q, {
      title: g.termZh,
      primaryFields: [g.termEn, ...(g.synonyms || [])],
      bodyFields: [g.definition],
    });
    if (score > 0) {
      results.push({
        type: 'glossary', id: g.id, title: g.termZh, subtitle: g.termEn,
        url: `/glossary#${g.id}`, score,
        snippet: makeSnippet(g.definition, q),
      });
    }
  }

  // Cases
  const cases = loadJson<any[]>(path.join(DATA_DIR, 'cases.json'));
  for (const c of cases) {
    const score = scoreMatch(q, {
      title: c.titleZh,
      primaryFields: [c.organ, c.finalDiagnosis],
      bodyFields: [c.clinicalHistory, c.grossDescription, c.expertCommentary, ...(c.keyLearningPoints || [])],
    });
    if (score > 0) {
      results.push({
        type: 'case', id: c.id, title: c.titleZh, subtitle: c.finalDiagnosis || c.organ || '',
        url: `/cases#${c.id}`, score,
        snippet: makeSnippet(c.clinicalHistory, q),
      });
    }
  }

  // Staging systems
  const staging = loadJson<any[]>(path.join(DATA_DIR, 'staging.json'));
  for (const s of staging) {
    const score = scoreMatch(q, {
      title: s.nameZh,
      primaryFields: [s.nameEn],
      bodyFields: [s.description],
    });
    if (score > 0) {
      results.push({
        type: 'staging', id: s.id, title: s.nameZh, subtitle: s.nameEn,
        url: `/staging`, score,
        snippet: makeSnippet(s.description, q),
      });
    }
  }

  // Special stains
  const stains = loadJson<any[]>(path.join(DATA_DIR, 'special-stains.json'));
  for (const s of stains) {
    const score = scoreMatch(q, {
      title: s.nameZh,
      primaryFields: [s.nameEn, s.abbreviation],
      bodyFields: [s.function, s.interpretation, s.clinicalSignificance],
    });
    if (score > 0) {
      results.push({
        type: 'special-stain', id: s.id, title: s.abbreviation || s.nameZh, subtitle: s.nameZh,
        url: `/markers/${s.id}`, score,
        snippet: makeSnippet(s.function, q) || makeSnippet(s.interpretation, q),
      });
    }
  }

  // Molecular markers
  const molecular = loadJson<any[]>(path.join(DATA_DIR, 'molecular.json'));
  for (const m of molecular) {
    const score = scoreMatch(q, {
      title: m.nameZh || m.geneSymbol,
      primaryFields: [m.nameEn, m.geneSymbol, ...(m.associatedTumors || [])],
      bodyFields: [m.clinicalSignificance],
    });
    if (score > 0) {
      results.push({
        type: 'molecular', id: m.id, title: m.geneSymbol || m.nameZh, subtitle: m.nameZh || m.nameEn || '',
        url: `/molecular#${m.id}`, score,
        snippet: makeSnippet(m.clinicalSignificance, q),
      });
    }
  }

  // Frozen section protocols
  const frozen = loadJson<any[]>(path.join(DATA_DIR, 'frozen-sections.json'));
  for (const f of frozen) {
    const score = scoreMatch(q, {
      title: f.nameZh,
      primaryFields: [f.nameEn, f.indication],
      bodyFields: [f.clinicalScenario, f.reportingTemplate],
    });
    if (score > 0) {
      results.push({
        type: 'frozen', id: f.id, title: f.nameZh, subtitle: f.nameEn,
        url: `/frozen#${f.id}`, score,
        snippet: makeSnippet(f.clinicalScenario, q) || makeSnippet(f.indication, q),
      });
    }
  }

  // Grossing protocols
  const grossing = loadJson<any[]>(path.join(DATA_DIR, 'grossing.json'));
  for (const g of grossing) {
    const score = scoreMatch(q, {
      title: g.nameZh,
      primaryFields: [g.nameEn, g.indication],
      bodyFields: [g.inkScheme, g.samplingInterval, ...(g.mandatorySites || [])],
    });
    if (score > 0) {
      results.push({
        type: 'grossing', id: g.id, title: g.nameZh, subtitle: g.nameEn,
        url: `/grossing#${g.id}`, score,
        snippet: makeSnippet(g.indication, q) || makeSnippet(g.inkScheme, q),
      });
    }
  }

  // Cytology systems
  const cytology = loadJson<any[]>(path.join(DATA_DIR, 'cytology.json'));
  for (const c of cytology) {
    const score = scoreMatch(q, {
      title: c.nameZh,
      primaryFields: [c.nameEn],
      bodyFields: [c.description],
    });
    if (score > 0) {
      results.push({
        type: 'cytology', id: c.id, title: c.nameZh, subtitle: c.nameEn,
        url: `/cyto#${c.id}`, score,
        snippet: makeSnippet(c.description, q),
      });
    }
  }

  // Sort by relevance score desc
  results.sort((a, b) => b.score - a.score);
  return results;
}

// ── Stats ─────────────────────────────────────────────────────────

export function getStats() {
  const organs = getOrgans();
  const diseases = getAllDiseases();
  const markers = getMarkers();
  const differentials = getDifferentials();
  return {
    organCount: organs.length,
    diseaseCount: diseases.length,
    markerCount: markers.length,
    differentialCount: differentials.length,
  };
}
