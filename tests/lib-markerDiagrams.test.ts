/**
 * Tests for src/lib/markerDiagrams.ts
 */
import { describe, it, expect } from 'vitest';
import { getMarkerDiagram, MARKER_DIAGRAMS, MARKERS_WITH_DIAGRAM } from '@/lib/markerDiagrams';

describe('MARKER_DIAGRAMS', () => {
  it('has entries', () => {
    expect(Object.keys(MARKER_DIAGRAMS).length).toBeGreaterThan(0);
  });

  it('MARKERS_WITH_DIAGRAM matches key count', () => {
    expect(MARKERS_WITH_DIAGRAM).toBe(Object.keys(MARKER_DIAGRAMS).length);
  });

  it('each entry has required fields', () => {
    for (const [id, diag] of Object.entries(MARKER_DIAGRAMS)) {
      expect(diag.url, `${id} missing url`).toBeTruthy();
      expect(diag.title, `${id} missing title`).toBeTruthy();
      expect(diag.caption, `${id} missing caption`).toBeTruthy();
    }
  });

  it('urls point to /diagrams/mechanism/ path', () => {
    for (const [id, diag] of Object.entries(MARKER_DIAGRAMS)) {
      expect(diag.url, `${id} url malformed`).toMatch(/^\/diagrams\/mechanism\/.+\.svg$/);
    }
  });
});

describe('getMarkerDiagram', () => {
  it('returns diagram for known marker', () => {
    const diag = getMarkerDiagram('er');
    expect(diag).toBeDefined();
    expect(diag!.title).toContain('ER');
  });

  it('returns undefined for unknown marker', () => {
    expect(getMarkerDiagram('nonexistent')).toBeUndefined();
  });
});
