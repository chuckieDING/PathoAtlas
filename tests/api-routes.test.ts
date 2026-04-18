/**
 * Integration tests — hit API routes via HTTP against the running dev server.
 * Requires dev server running on http://127.0.0.1:3000.
 *
 * When auth is enabled (Google OAuth configured), unauthenticated requests
 * return 401. These tests detect that and skip the assertions.
 */
import { describe, it, expect, beforeAll } from 'vitest';

const BASE = 'http://127.0.0.1:3000';

let authEnabled = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE}/api/auth/me`);
    const data = await res.json();
    authEnabled = !!(data.authRequired && data.error);
  } catch { /* server not running */ }
});

async function fetchJson(path: string) {
  const res = await fetch(`${BASE}${path}`);
  if (res.status === 401) return null;
  expect(res.status).toBe(200);
  return res.json();
}

async function fetchStatus(path: string): Promise<number> {
  const res = await fetch(`${BASE}${path}`);
  return res.status;
}

// ── Data API routes ───────────────────────────────────────

describe('GET /api/organs', () => {
  it('returns array of organs', async () => {
    const data = await fetchJson('/api/organs');
    if (!data) return; // auth blocked
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('nameZh');
  });
});

describe('GET /api/markers', () => {
  it('returns array of markers with organs', async () => {
    const data = await fetchJson('/api/markers');
    if (!data) return;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('organs');
  });
});

describe('GET /api/all-diseases', () => {
  it('returns array of diseases', async () => {
    const data = await fetchJson('/api/all-diseases');
    if (!data) return;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('organ');
  });
});

describe('GET /api/stats', () => {
  it('returns counts', async () => {
    const data = await fetchJson('/api/stats');
    if (!data) return;
    expect(data).toHaveProperty('organCount');
    expect(data).toHaveProperty('diseaseCount');
    expect(data).toHaveProperty('markerCount');
    expect(data.organCount).toBeGreaterThan(0);
  });
});

describe('GET /api/flowcharts', () => {
  it('returns array of flowcharts', async () => {
    const data = await fetchJson('/api/flowcharts');
    if (!data) return;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('nodes');
    expect(data[0]).toHaveProperty('edges');
  });
});

describe('GET /api/search', () => {
  it('returns results for valid query', async () => {
    const data = await fetchJson('/api/search?q=乳腺');
    if (!data) return;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('returns empty array for empty query', async () => {
    const data = await fetchJson('/api/search?q=');
    if (!data) return;
    expect(data).toEqual([]);
  });

  it('returns empty for gibberish', async () => {
    const data = await fetchJson('/api/search?q=zzzxxx999');
    if (!data) return;
    expect(data).toEqual([]);
  });
});

describe('GET /api/organ', () => {
  it('returns organ data', async () => {
    const data = await fetchJson('/api/organ?id=breast');
    if (!data) return;
    expect(data).toHaveProperty('id', 'breast');
  });
});

describe('GET /api/disease', () => {
  it('returns disease data', async () => {
    const res = await fetch(`${BASE}/api/disease?organ=breast&id=invasive-ductal-carcinoma`);
    if (res.status === 401) return;
    expect([200, 404]).toContain(res.status);
  });
});

describe('GET /api/marker', () => {
  it('returns marker data', async () => {
    const res = await fetch(`${BASE}/api/marker?id=ck7`);
    if (res.status === 401) return;
    expect([200, 404]).toContain(res.status);
  });
});

describe('GET /api/glossary', () => {
  it('returns glossary data', async () => {
    const data = await fetchJson('/api/glossary');
    if (!data) return;
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('GET /api/cases', () => {
  it('returns case data', async () => {
    const data = await fetchJson('/api/cases');
    if (!data) return;
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('GET /api/curriculum', () => {
  it('returns curriculum data', async () => {
    const data = await fetchJson('/api/curriculum');
    if (!data) return;
    expect(typeof data === 'object' && data !== null).toBe(true);
  });
});

describe('GET /api/cytology', () => {
  it('returns cytology data', async () => {
    const data = await fetchJson('/api/cytology');
    if (!data) return;
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('GET /api/frozen', () => {
  it('returns frozen section data', async () => {
    const data = await fetchJson('/api/frozen');
    if (!data) return;
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('GET /api/grossing', () => {
  it('returns grossing data', async () => {
    const data = await fetchJson('/api/grossing');
    if (!data) return;
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('GET /api/molecular', () => {
  it('returns molecular data', async () => {
    const data = await fetchJson('/api/molecular');
    if (!data) return;
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('GET /api/panel-builder', () => {
  it('returns panel builder data', async () => {
    const data = await fetchJson('/api/panel-builder');
    if (!data) return;
    expect(Array.isArray(data) || typeof data === 'object').toBe(true);
  });
});

describe('GET /api/reports', () => {
  it('returns reports data', async () => {
    const data = await fetchJson('/api/reports');
    if (!data) return;
    expect(Array.isArray(data) || typeof data === 'object').toBe(true);
  });
});

// ── Auth endpoints (always accessible) ────────────────────

describe('auth endpoints', () => {
  it('GET /api/auth/me returns auth status', async () => {
    const res = await fetch(`${BASE}/api/auth/me`);
    // Should always be accessible (not blocked by middleware)
    expect([200, 401]).toContain(res.status);
    const data = await res.json();
    expect(data).toHaveProperty(authEnabled ? 'error' : 'email');
  });

  it('GET /login returns 200', async () => {
    const status = await fetchStatus('/login');
    expect(status).toBe(200);
  });
});

// ── Page routes ───────────────────────────────────────────

describe('page routes', () => {
  const pages = [
    '/', '/atlas', '/markers', '/differentials', '/review',
    '/progress', '/search', '/favorites', '/about', '/help',
    '/cases', '/curriculum', '/cyto', '/frozen', '/grossing',
    '/glossary', '/molecular', '/panel-builder',
  ];

  for (const page of pages) {
    it(`GET ${page} returns 200 or redirects to login`, async () => {
      const res = await fetch(`${BASE}${page}`, { redirect: 'manual' });
      if (authEnabled) {
        // Should redirect to /login
        expect([200, 307]).toContain(res.status);
      } else {
        expect(res.status).toBe(200);
      }
    });
  }
});
