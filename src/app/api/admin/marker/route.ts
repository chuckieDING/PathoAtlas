import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Admin CRUD for IHC markers. Same contract as /api/admin/disease but the
 * data lives in a single flat file (data/markers.json).
 *
 *   POST   { marker: { id, nameZh, ... } }   -> append
 *   PUT    { id, updates: { ... } }          -> merge editable fields
 *   DELETE ?id=<id>                          -> remove
 */

const EDITABLE_FIELDS = [
  'nameZh', 'nameEn', 'abbreviation', 'category',
  'cloneInfo', 'targetProtein', 'cellularLocalization', 'normalExpression',
  'function', 'interpretation', 'clinicalSignificance',
  'positiveIn', 'negativeIn', 'relatedDrugs', 'pitfalls',
  'references',
  'expertConsensus', 'literature', 'stainingImages',
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

const MARKERS_FILE = path.join(process.cwd(), 'data', 'markers.json');

function readList(): Record<string, unknown>[] {
  return JSON.parse(fs.readFileSync(MARKERS_FILE, 'utf-8')) as Record<string, unknown>[];
}

function writeList(list: unknown[]): void {
  fs.writeFileSync(MARKERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

function blankMarker(id: string): Record<string, unknown> {
  return {
    id,
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

// ── Update ─────────────────────────────────────────────────────────

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, updates } = body as {
      id: string;
      updates: Partial<Record<EditableField, unknown>>;
    };
    if (!id || !updates) {
      return NextResponse.json({ error: 'id, updates required' }, { status: 400 });
    }
    const list = readList();
    const idx = list.findIndex((m) => m.id === id);
    if (idx < 0) {
      return NextResponse.json({ error: `marker not found: ${id}` }, { status: 404 });
    }
    const next = { ...list[idx] };
    for (const key of EDITABLE_FIELDS) {
      if (key in updates) {
        next[key] = updates[key];
      }
    }
    list[idx] = next;
    writeList(list);
    return NextResponse.json({ ok: true, marker: next });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── Create ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { marker } = body as {
      marker: { id: string } & Partial<Record<EditableField, unknown>>;
    };
    if (!marker?.id) {
      return NextResponse.json({ error: 'marker.id required' }, { status: 400 });
    }
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(marker.id)) {
      return NextResponse.json({ error: 'marker.id must be kebab-case ASCII' }, { status: 400 });
    }
    const list = readList();
    if (list.some((m) => m.id === marker.id)) {
      return NextResponse.json({ error: `marker id already exists: ${marker.id}` }, { status: 409 });
    }
    const next = blankMarker(marker.id);
    for (const key of EDITABLE_FIELDS) {
      if (key in marker) {
        next[key] = marker[key] as unknown;
      }
    }
    list.push(next);
    writeList(list);
    return NextResponse.json({ ok: true, marker: next });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── Delete ─────────────────────────────────────────────────────────

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    const list = readList();
    const idx = list.findIndex((m) => m.id === id);
    if (idx < 0) {
      return NextResponse.json({ error: `marker not found: ${id}` }, { status: 404 });
    }
    const removed = list.splice(idx, 1)[0];
    writeList(list);
    return NextResponse.json({ ok: true, removed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
