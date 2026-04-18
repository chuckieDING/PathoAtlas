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

export interface SearchResult {
  type: 'disease' | 'marker' | 'differential';
  id: string;
  title: string;
  subtitle: string;
  organ?: string;
  url: string;
}

export function searchAll(query: string): SearchResult[] {
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  // Search diseases
  for (const disease of getAllDiseases()) {
    const haystack = [disease.nameZh, disease.nameEn, ...disease.aliases, disease.microscopy, disease.clinicalFeatures, ...disease.keyFeatures].join(' ').toLowerCase();
    if (haystack.includes(q)) {
      results.push({
        type: 'disease',
        id: disease.id,
        title: disease.nameZh,
        subtitle: disease.nameEn,
        organ: disease.organ,
        url: `/atlas/${disease.organ}/${disease.id}`,
      });
    }
  }

  // Search markers
  for (const marker of getMarkers()) {
    const haystack = [marker.nameZh, marker.nameEn, marker.abbreviation, marker.function, marker.clinicalSignificance, ...marker.positiveIn].join(' ').toLowerCase();
    if (haystack.includes(q)) {
      results.push({
        type: 'marker',
        id: marker.id,
        title: marker.abbreviation || marker.nameEn,
        subtitle: marker.nameZh,
        url: `/markers/${marker.id}`,
      });
    }
  }

  // Search differentials
  for (const diff of getDifferentials()) {
    const haystack = [diff.titleZh, diff.titleEn, diff.description, diff.algorithm].join(' ').toLowerCase();
    if (haystack.includes(q)) {
      results.push({
        type: 'differential',
        id: diff.id,
        title: diff.titleZh,
        subtitle: diff.titleEn,
        url: `/differentials#${diff.id}`,
      });
    }
  }

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
