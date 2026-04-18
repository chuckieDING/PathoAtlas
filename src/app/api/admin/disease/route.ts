import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { invalidateJsonCache } from '@/lib/data';
import { appendAuditLog, computeDiff } from '@/lib/audit';
import { getDataDir } from '@/lib/dataDir';

/**
 * Drops both the in-process JSON cache for the affected file and the
 * Next.js Router cache entries for any pages that read this disease.
 * Without this, `next start`'s long-lived process keeps serving stale
 * data until restart even though the file on disk was updated.
 */
function invalidateAfterWrite(filePath: string, organ: string, id?: string) {
  invalidateJsonCache(filePath);
  // Pages affected by a disease change:
  //   /atlas                    (homepage organ index)
  //   /atlas/<organ>            (organ disease list)
  //   /atlas/<organ>/<id>       (disease detail page)
  //   /search                   (full-text search)
  // revalidatePath blows away both the data cache and the rendered HTML
  // for the next request, triggering an on-demand ISR rebuild.
  revalidatePath('/atlas');
  revalidatePath(`/atlas/${organ}`);
  if (id) revalidatePath(`/atlas/${organ}/${id}`);
  revalidatePath('/search');
}

/**
 * Admin CRUD for diseases. All three verbs (POST/PUT/DELETE) are
 * intentionally unauthenticated — single-tenant editorial tool. Front with a
 * gating proxy if you deploy publicly.
 *
 * Data shape:
 *   POST   { organ, disease: { id, nameZh, ... } }      -> append to organ file
 *   PUT    { organ, id, updates: { ... } }              -> merge editable fields
 *   DELETE { organ, id }  (via query string)            -> remove from organ file
 */

// Every field the admin UI may edit. Kept as a single source of truth so
// PUT's merge logic and the admin form stay in sync.
const EDITABLE_FIELDS = [
  'nameZh', 'nameEn', 'aliases', 'category',
  'epidemiology', 'clinicalFeatures',
  'grossPathology', 'grossDescription', 'microscopy',
  'keyFeatures', 'ihcProfile', 'molecularFeatures',
  'differentialDiagnosis',
  'differentialDiagnosisNotes',
  'grading', 'staging', 'prognosis', 'treatment',
  'images', 'microscopyImages', 'grossImages',
  'expertConsensus', 'literature', 'references',
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

function organFilePath(organ: string): string {
  // Hard guard: the organ argument becomes part of a filename, so only
  // accept the restricted charset we use elsewhere.
  if (!/^[a-z][a-z0-9-]*$/i.test(organ)) {
    throw new Error(`invalid organ id: ${organ}`);
  }
  return path.join(getDataDir(), 'diseases', `${organ}.json`);
}

function readList(filePath: string): Record<string, unknown>[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as Record<string, unknown>[];
}

function writeList(filePath: string, list: unknown[]): void {
  fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
}

/** Blank disease scaffold — the admin UI will merge user edits into this. */
function blankDisease(id: string, organ: string): Record<string, unknown> {
  return {
    id,
    nameZh: '',
    nameEn: '',
    aliases: [],
    organ,
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

// ── Update ─────────────────────────────────────────────────────────

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { organ, id, updates } = body as {
      organ: string;
      id: string;
      updates: Partial<Record<EditableField, unknown>>;
    };
    if (!organ || !id || !updates) {
      return NextResponse.json({ error: 'organ, id, updates required' }, { status: 400 });
    }
    const filePath = organFilePath(organ);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `organ file not found: ${organ}` }, { status: 404 });
    }
    const list = readList(filePath);
    const idx = list.findIndex((d) => d.id === id);
    if (idx < 0) {
      return NextResponse.json({ error: `disease not found: ${id}` }, { status: 404 });
    }
    const oldRecord = { ...list[idx] };
    const next = { ...list[idx] };
    for (const key of EDITABLE_FIELDS) {
      if (key in updates) {
        next[key] = updates[key];
      }
    }
    list[idx] = next;
    writeList(filePath, list);
    const diff = computeDiff(oldRecord, next);
    appendAuditLog({
      timestamp: new Date().toISOString(),
      actor: 'admin',
      action: 'update',
      entityType: 'disease',
      entityId: id,
      organ,
      diff,
    });
    invalidateAfterWrite(filePath, organ, id);
    return NextResponse.json({ ok: true, disease: next });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── Create ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { organ, disease } = body as {
      organ: string;
      disease: { id: string } & Partial<Record<EditableField, unknown>>;
    };
    if (!organ || !disease?.id) {
      return NextResponse.json({ error: 'organ and disease.id required' }, { status: 400 });
    }
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(disease.id)) {
      return NextResponse.json({ error: 'disease.id must be kebab-case ASCII' }, { status: 400 });
    }
    const filePath = organFilePath(organ);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `organ file not found: ${organ}` }, { status: 404 });
    }
    const list = readList(filePath);
    if (list.some((d) => d.id === disease.id)) {
      return NextResponse.json({ error: `disease id already exists: ${disease.id}` }, { status: 409 });
    }
    // Build the record by merging the supplied fields onto a blank scaffold
    // so every disease has the full field set regardless of what the admin
    // UI sent.
    const next = blankDisease(disease.id, organ);
    for (const key of EDITABLE_FIELDS) {
      if (key in disease) {
        next[key] = disease[key] as unknown;
      }
    }
    list.push(next);
    writeList(filePath, list);
    appendAuditLog({
      timestamp: new Date().toISOString(),
      actor: 'admin',
      action: 'create',
      entityType: 'disease',
      entityId: disease.id,
      organ,
    });
    invalidateAfterWrite(filePath, organ, disease.id);
    return NextResponse.json({ ok: true, disease: next });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── Delete ─────────────────────────────────────────────────────────

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organ = searchParams.get('organ') || '';
    const id = searchParams.get('id') || '';
    if (!organ || !id) {
      return NextResponse.json({ error: 'organ and id required' }, { status: 400 });
    }
    const filePath = organFilePath(organ);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `organ file not found: ${organ}` }, { status: 404 });
    }
    const list = readList(filePath);
    const idx = list.findIndex((d) => d.id === id);
    if (idx < 0) {
      return NextResponse.json({ error: `disease not found: ${id}` }, { status: 404 });
    }
    const removed = list.splice(idx, 1)[0];
    writeList(filePath, list);
    appendAuditLog({
      timestamp: new Date().toISOString(),
      actor: 'admin',
      action: 'delete',
      entityType: 'disease',
      entityId: id,
      organ,
    });
    invalidateAfterWrite(filePath, organ, id);
    return NextResponse.json({ ok: true, removed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
