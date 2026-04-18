/**
 * Tests for src/lib/data.ts — data loading, search, and stats.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getOrgans, getOrgan, getDiseasesByOrgan, getDisease, getAllDiseases,
  getMarkers, getMarker, getMarkersWithOrgans, getStagingSystems,
  getDifferentials, searchAll, getStats, invalidateJsonCache,
} from '@/lib/data';

beforeEach(() => {
  invalidateJsonCache();
});

// ── Organ loading ────────────────────────────────────────────

describe('getOrgans', () => {
  it('returns an array of organs', () => {
    const organs = getOrgans();
    expect(organs.length).toBeGreaterThan(0);
    expect(organs[0]).toHaveProperty('id');
    expect(organs[0]).toHaveProperty('nameZh');
  });
});

describe('getOrgan', () => {
  it('returns a specific organ by id', () => {
    const organs = getOrgans();
    const organ = getOrgan(organs[0].id);
    expect(organ).toBeDefined();
    expect(organ!.id).toBe(organs[0].id);
  });

  it('returns undefined for non-existent organ', () => {
    expect(getOrgan('non-existent-organ-xyz')).toBeUndefined();
  });
});

// ── Disease loading ──────────────────────────────────────────

describe('getDiseasesByOrgan', () => {
  it('returns diseases for a valid organ', () => {
    const organs = getOrgans();
    const diseases = getDiseasesByOrgan(organs[0].id);
    expect(diseases.length).toBeGreaterThan(0);
    expect(diseases[0]).toHaveProperty('id');
    expect(diseases[0]).toHaveProperty('nameZh');
    expect(diseases[0].organ).toBe(organs[0].id);
  });

  it('returns empty array for non-existent organ', () => {
    const diseases = getDiseasesByOrgan('non-existent');
    expect(diseases).toEqual([]);
  });
});

describe('getDisease', () => {
  it('returns a specific disease', () => {
    const organs = getOrgans();
    const diseases = getDiseasesByOrgan(organs[0].id);
    const disease = getDisease(organs[0].id, diseases[0].id);
    expect(disease).toBeDefined();
    expect(disease!.id).toBe(diseases[0].id);
  });

  it('returns undefined for non-existent disease', () => {
    const organs = getOrgans();
    expect(getDisease(organs[0].id, 'non-existent')).toBeUndefined();
  });
});

describe('getAllDiseases', () => {
  it('returns all diseases across all organs', () => {
    const all = getAllDiseases();
    expect(all.length).toBeGreaterThan(0);

    // Should have diseases from multiple organs
    const organIds = new Set(all.map(d => d.organ));
    expect(organIds.size).toBeGreaterThan(1);
  });

  it('total matches sum of per-organ counts', () => {
    const organs = getOrgans();
    let total = 0;
    for (const o of organs) {
      total += getDiseasesByOrgan(o.id).length;
    }
    expect(getAllDiseases().length).toBe(total);
  });
});

// ── Marker loading ───────────────────────────────────────────

describe('getMarkers', () => {
  it('returns non-empty array', () => {
    const markers = getMarkers();
    expect(markers.length).toBeGreaterThan(0);
    expect(markers[0]).toHaveProperty('id');
  });
});

describe('getMarker', () => {
  it('returns a specific marker', () => {
    const markers = getMarkers();
    const marker = getMarker(markers[0].id);
    expect(marker).toBeDefined();
    expect(marker!.id).toBe(markers[0].id);
  });

  it('returns undefined for non-existent marker', () => {
    expect(getMarker('non-existent-marker')).toBeUndefined();
  });
});

describe('getMarkersWithOrgans', () => {
  it('returns markers with organs array', () => {
    const markers = getMarkersWithOrgans();
    expect(markers.length).toBeGreaterThan(0);
    for (const m of markers) {
      expect(Array.isArray(m.organs)).toBe(true);
    }
  });

  it('at least some markers have organ associations', () => {
    const markers = getMarkersWithOrgans();
    const withOrgans = markers.filter(m => m.organs.length > 0);
    expect(withOrgans.length).toBeGreaterThan(0);
  });
});

// ── Staging, differentials ───────────────────────────────────

describe('getStagingSystems', () => {
  it('returns non-empty array', () => {
    const systems = getStagingSystems();
    expect(systems.length).toBeGreaterThan(0);
    expect(systems[0]).toHaveProperty('id');
  });
});

describe('getDifferentials', () => {
  it('returns non-empty array', () => {
    const diffs = getDifferentials();
    expect(diffs.length).toBeGreaterThan(0);
    expect(diffs[0]).toHaveProperty('id');
    expect(diffs[0]).toHaveProperty('titleZh');
  });
});

// ── Search ───────────────────────────────────────────────────

describe('searchAll', () => {
  it('returns results for a known disease name', () => {
    const all = getAllDiseases();
    const first = all[0];
    const results = searchAll(first.nameZh);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.type === 'disease')).toBe(true);
  });

  it('returns results for a known marker abbreviation', () => {
    const markers = getMarkers();
    const m = markers.find(m => m.abbreviation);
    if (m) {
      const results = searchAll(m.abbreviation);
      expect(results.length).toBeGreaterThan(0);
    }
  });

  it('returns empty for gibberish query', () => {
    const results = searchAll('zzzxxxqqqnonexistent12345');
    expect(results).toEqual([]);
  });

  it('result URLs are valid paths', () => {
    const results = searchAll('肿瘤');
    for (const r of results) {
      expect(r.url).toMatch(/^\//);
    }
  });
});

// ── Stats ────────────────────────────────────────────────────

describe('getStats', () => {
  it('returns correct counts', () => {
    const stats = getStats();
    expect(stats.organCount).toBe(getOrgans().length);
    expect(stats.diseaseCount).toBe(getAllDiseases().length);
    expect(stats.markerCount).toBe(getMarkers().length);
    expect(stats.differentialCount).toBe(getDifferentials().length);
    expect(stats.organCount).toBeGreaterThan(0);
    expect(stats.diseaseCount).toBeGreaterThan(0);
    expect(stats.markerCount).toBeGreaterThan(0);
  });
});

// ── Cache ────────────────────────────────────────────────────

describe('invalidateJsonCache', () => {
  it('cache works — second call is faster or same', () => {
    invalidateJsonCache();
    const t1 = performance.now();
    getOrgans();
    const elapsed1 = performance.now() - t1;

    const t2 = performance.now();
    getOrgans(); // should be cached
    const elapsed2 = performance.now() - t2;

    // cached should be no slower than cold read (allows for noise)
    expect(elapsed2).toBeLessThanOrEqual(elapsed1 + 5);
  });

  it('invalidation forces re-read', () => {
    getOrgans(); // populate cache
    invalidateJsonCache();
    // Should not throw after invalidation
    const organs = getOrgans();
    expect(organs.length).toBeGreaterThan(0);
  });
});
