/**
 * Data integrity tests — validate JSON data files for structure,
 * required fields, and cross-references.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
}

// ── organs.json ──────────────────────────────────────────────

describe('organs.json', () => {
  const organs = loadJson<any[]>('organs.json');

  it('is a non-empty array', () => {
    expect(Array.isArray(organs)).toBe(true);
    expect(organs.length).toBeGreaterThan(0);
  });

  it('each organ has required fields', () => {
    for (const o of organs) {
      expect(o.id).toBeTruthy();
      expect(o.nameZh).toBeTruthy();
      expect(o.nameEn).toBeTruthy();
      expect(o.color).toBeTruthy();
    }
  });

  it('organ ids are unique', () => {
    const ids = organs.map((o: any) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each organ has a corresponding disease file', () => {
    for (const o of organs) {
      const diseasePath = path.join(DATA_DIR, 'diseases', `${o.id}.json`);
      expect(fs.existsSync(diseasePath), `Missing disease file for organ: ${o.id}`).toBe(true);
    }
  });
});

// ── Disease files ────────────────────────────────────────────

describe('disease files', () => {
  const organs = loadJson<any[]>('organs.json');

  for (const organ of organs) {
    describe(`diseases/${organ.id}.json`, () => {
      const diseases = loadJson<any[]>(`diseases/${organ.id}.json`);

      it('is a non-empty array', () => {
        expect(Array.isArray(diseases)).toBe(true);
        expect(diseases.length).toBeGreaterThan(0);
      });

      it('each disease has required fields', () => {
        for (const d of diseases) {
          expect(d.id, `disease missing id in ${organ.id}`).toBeTruthy();
          expect(d.nameZh, `disease ${d.id} missing nameZh`).toBeTruthy();
          expect(d.nameEn, `disease ${d.id} missing nameEn`).toBeTruthy();
          expect(d.organ, `disease ${d.id} missing organ`).toBe(organ.id);
          expect(
            ['benign', 'malignant', 'precancerous', 'inflammatory', 'other'],
            `disease ${d.id} invalid category: ${d.category}`,
          ).toContain(d.category);
          expect(Array.isArray(d.keyFeatures), `disease ${d.id} keyFeatures not array`).toBe(true);
          expect(Array.isArray(d.ihcProfile), `disease ${d.id} ihcProfile not array`).toBe(true);
          expect(Array.isArray(d.references), `disease ${d.id} references not array`).toBe(true);
        }
      });

      it('disease ids are unique within organ', () => {
        const ids = diseases.map((d: any) => d.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it('ihcProfile entries have marker, result, note', () => {
        for (const d of diseases) {
          for (const ihc of d.ihcProfile) {
            expect(ihc.marker, `ihc missing marker in ${d.id}`).toBeTruthy();
            expect(typeof ihc.result, `ihc missing result in ${d.id}`).toBe('string');
            expect(typeof ihc.note, `ihc missing note in ${d.id}`).toBe('string');
          }
        }
      });
    });
  }
});

// ── markers.json ─────────────────────────────────────────────

describe('markers.json', () => {
  const markers = loadJson<any[]>('markers.json');

  it('is a non-empty array', () => {
    expect(Array.isArray(markers)).toBe(true);
    expect(markers.length).toBeGreaterThan(0);
  });

  it('each marker has required fields', () => {
    for (const m of markers) {
      expect(m.id, 'marker missing id').toBeTruthy();
      expect(m.nameZh || m.nameEn, `marker ${m.id} missing name`).toBeTruthy();
      expect(Array.isArray(m.positiveIn), `marker ${m.id} positiveIn not array`).toBe(true);
      expect(Array.isArray(m.negativeIn), `marker ${m.id} negativeIn not array`).toBe(true);
    }
  });

  it('marker ids are unique', () => {
    const ids = markers.map((m: any) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── differentials.json ───────────────────────────────────────

describe('differentials.json', () => {
  const diffs = loadJson<any[]>('differentials.json');

  it('is a non-empty array', () => {
    expect(Array.isArray(diffs)).toBe(true);
    expect(diffs.length).toBeGreaterThan(0);
  });

  it('each differential has required fields', () => {
    for (const d of diffs) {
      expect(d.id).toBeTruthy();
      expect(d.titleZh).toBeTruthy();
      expect(d.titleEn).toBeTruthy();
      expect(Array.isArray(d.diseases)).toBe(true);
      expect(Array.isArray(d.keyMarkers)).toBe(true);
    }
  });

  it('differential ids are unique', () => {
    const ids = diffs.map((d: any) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── flowcharts.json ──────────────────────────────────────────

describe('flowcharts.json', () => {
  const flowcharts = loadJson<any[]>('flowcharts.json');

  it('is a non-empty array', () => {
    expect(Array.isArray(flowcharts)).toBe(true);
    expect(flowcharts.length).toBeGreaterThan(0);
  });

  it('each flowchart has required structure', () => {
    for (const fc of flowcharts) {
      expect(fc.id).toBeTruthy();
      expect(fc.titleZh).toBeTruthy();
      expect(Array.isArray(fc.nodes)).toBe(true);
      expect(Array.isArray(fc.edges)).toBe(true);
      expect(fc.nodes.length).toBeGreaterThan(0);
    }
  });

  it('node ids are unique within each flowchart', () => {
    for (const fc of flowcharts) {
      const ids = fc.nodes.map((n: any) => n.id);
      expect(new Set(ids).size, `duplicate node ids in ${fc.id}`).toBe(ids.length);
    }
  });

  it('edges reference valid node ids', () => {
    for (const fc of flowcharts) {
      const nodeIds = new Set(fc.nodes.map((n: any) => n.id));
      for (const e of fc.edges) {
        expect(nodeIds.has(e.from), `edge from unknown node "${e.from}" in ${fc.id}`).toBe(true);
        expect(nodeIds.has(e.to), `edge to unknown node "${e.to}" in ${fc.id}`).toBe(true);
      }
    }
  });

  it('nodes have valid types', () => {
    for (const fc of flowcharts) {
      for (const n of fc.nodes) {
        expect(['start', 'decision', 'result']).toContain(n.type);
      }
    }
  });

  it('no horizontal overlaps between nodes (MIN_GAP >= 20)', () => {
    const NODE_W = 160;
    const DIAMOND_EXTRA = 8;
    const MIN_GAP = 20;
    for (const fc of flowcharts) {
      const rows = new Map<number, any[]>();
      for (const n of fc.nodes) {
        const row = rows.get(n.y) || [];
        row.push(n);
        rows.set(n.y, row);
      }
      for (const [y, row] of rows) {
        if (row.length < 2) continue;
        row.sort((a: any, b: any) => a.x - b.x);
        for (let i = 0; i < row.length - 1; i++) {
          const a = row[i], b = row[i + 1];
          const aHW = a.type === 'decision' ? NODE_W / 2 + DIAMOND_EXTRA : NODE_W / 2;
          const bHW = b.type === 'decision' ? NODE_W / 2 + DIAMOND_EXTRA : NODE_W / 2;
          const gap = (b.x - bHW) - (a.x + aHW);
          expect(gap, `overlap in ${fc.id} y=${y}: ${a.id}↔${b.id} gap=${gap}`).toBeGreaterThanOrEqual(MIN_GAP);
        }
      }
    }
  });
});

// ── Other data files existence ───────────────────────────────

describe('required data files exist', () => {
  const required = [
    'organs.json', 'markers.json', 'differentials.json', 'flowcharts.json',
    'staging.json', 'cases.json', 'curriculum.json', 'cytology.json',
    'frozen-sections.json', 'grossing.json', 'glossary.json',
    'molecular.json', 'panel-builder.json', 'special-stains.json',
    'synoptic-templates.json',
  ];

  for (const file of required) {
    it(`${file} exists and is valid JSON`, () => {
      const filePath = path.join(DATA_DIR, file);
      expect(fs.existsSync(filePath), `missing: ${file}`).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });
  }
});

// ── Cross-reference: disease differentialDiagnosis ───────────

describe('cross-references', () => {
  const organs = loadJson<any[]>('organs.json');
  const allDiseases: any[] = [];
  for (const o of organs) {
    allDiseases.push(...loadJson<any[]>(`diseases/${o.id}.json`));
  }
  const allDiseaseIds = new Set(allDiseases.map((d: any) => d.id));

  const markers = loadJson<any[]>('markers.json');
  const markerSlugs = new Set(markers.map((m: any) => m.id));

  it('disease images have url and caption', () => {
    for (const d of allDiseases) {
      for (const img of d.images || []) {
        expect(img.url, `image missing url in ${d.id}`).toBeTruthy();
        expect(typeof img.caption, `image missing caption in ${d.id}`).toBe('string');
      }
    }
  });

  it('differentials.diseases references all resolve to existing diseases', () => {
    const diffs = loadJson<any[]>('differentials.json');
    for (const diff of diffs) {
      for (const id of diff.diseases || []) {
        expect(allDiseaseIds.has(id), `${diff.id} references unknown disease: ${id}`).toBe(true);
      }
    }
  });

  it('staging.applicableTo references all resolve to existing diseases', () => {
    const staging = loadJson<any[]>('staging.json');
    for (const sys of staging) {
      for (const id of sys.applicableTo || []) {
        expect(allDiseaseIds.has(id), `${sys.id} references unknown disease: ${id}`).toBe(true);
      }
    }
  });

  it('disease.differentialDiagnosis references all resolve to existing diseases', () => {
    for (const d of allDiseases) {
      for (const id of d.differentialDiagnosis || []) {
        expect(allDiseaseIds.has(id), `${d.id}.differentialDiagnosis references unknown: ${id}`).toBe(true);
      }
    }
  });

  it('markers referenced in differentials.keyMarkers have reasonable format', () => {
    const diffs = loadJson<any[]>('differentials.json');
    for (const diff of diffs) {
      for (const km of diff.keyMarkers) {
        expect(typeof km).toBe('string');
        expect(km.length).toBeGreaterThan(0);
      }
    }
  });
});
