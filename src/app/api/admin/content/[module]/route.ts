import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { invalidateJsonCache } from '@/lib/data';
import { appendAuditLog } from '@/lib/audit';
import { getDataDir } from '@/lib/dataDir';

/**
 * Generic admin CRUD for non-disease/non-marker content modules.
 *
 * Handles any JSON array-of-objects file keyed by `id`. Safety:
 *  - Module name validated against MODULES whitelist (prevents arbitrary file access)
 *  - Only predefined files can be read/written
 *
 * Routes:
 *   GET    /api/admin/content/<module>           → entire array
 *   POST   /api/admin/content/<module>           → append new entry
 *          body: { entry: { id, ... } }
 *   PUT    /api/admin/content/<module>           → merge updates into existing entry
 *          body: { id, updates: { ... } }
 *   DELETE /api/admin/content/<module>?id=<id>   → remove entry
 */

interface ModuleConfig {
  file: string;
  /** Pages to revalidate after mutation */
  revalidate: string[];
  /** Optional: for object-type files (non-array), this key holds the array */
  objectKey?: string;
  /** Human-readable label for audit log */
  label: string;
}

const MODULES: Record<string, ModuleConfig> = {
  organs: {
    file: 'organs.json',
    revalidate: ['/atlas', '/'],
    label: 'organ',
  },
  differentials: {
    file: 'differentials.json',
    revalidate: ['/differentials', '/atlas'],
    label: 'differential',
  },
  flowcharts: {
    file: 'flowcharts.json',
    revalidate: ['/differentials'],
    label: 'flowchart',
  },
  staging: {
    file: 'staging.json',
    revalidate: ['/staging'],
    label: 'staging-system',
  },
  cases: {
    file: 'cases.json',
    revalidate: ['/cases'],
    label: 'case',
  },
  cytology: {
    file: 'cytology.json',
    revalidate: ['/cyto'],
    label: 'cytology-system',
  },
  'frozen-sections': {
    file: 'frozen-sections.json',
    revalidate: ['/frozen'],
    label: 'frozen-protocol',
  },
  glossary: {
    file: 'glossary.json',
    revalidate: ['/glossary'],
    label: 'glossary-term',
  },
  grossing: {
    file: 'grossing.json',
    revalidate: ['/grossing'],
    label: 'grossing-protocol',
  },
  molecular: {
    file: 'molecular.json',
    revalidate: ['/molecular'],
    label: 'molecular-entry',
  },
  reports: {
    file: 'synoptic-templates.json',
    revalidate: ['/reports'],
    label: 'synoptic-template',
  },
  'special-stains': {
    file: 'special-stains.json',
    revalidate: ['/markers', '/atlas'],
    label: 'special-stain',
  },
};

function getModuleConfig(module: string): ModuleConfig | null {
  return MODULES[module] || null;
}

function readList(filePath: string): Record<string, unknown>[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function writeList(filePath: string, list: unknown[]): void {
  fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
}

function invalidateAfterWrite(filePath: string, revalidatePaths: string[]) {
  invalidateJsonCache(filePath);
  for (const p of revalidatePaths) revalidatePath(p);
}

function audit(action: 'create' | 'update' | 'delete', label: string, id: string, actor: string) {
  appendAuditLog({
    timestamp: new Date().toISOString(),
    actor,
    action,
    entityType: label as any,
    entityId: id,
  });
}

function getActor(req: Request): string {
  return req.headers.get('x-admin-email') || 'admin';
}

// ── GET: list all entries ───────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ module: string }> },
) {
  const { module } = await params;
  const config = getModuleConfig(module);
  if (!config) {
    return NextResponse.json({ error: `unknown module: ${module}` }, { status: 404 });
  }
  try {
    const filePath = path.join(getDataDir(), config.file);
    if (!fs.existsSync(filePath)) return NextResponse.json([]);
    const list = readList(filePath);
    return NextResponse.json(list);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: create new entry ──────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ module: string }> },
) {
  const { module } = await params;
  const config = getModuleConfig(module);
  if (!config) {
    return NextResponse.json({ error: `unknown module: ${module}` }, { status: 404 });
  }
  try {
    const body = await req.json();
    const entry = body.entry as Record<string, unknown>;
    if (!entry || typeof entry !== 'object' || !entry.id) {
      return NextResponse.json({ error: 'entry must be object with id' }, { status: 400 });
    }
    if (typeof entry.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/i.test(entry.id)) {
      return NextResponse.json({ error: 'invalid id format' }, { status: 400 });
    }

    const filePath = path.join(getDataDir(), config.file);
    const list = fs.existsSync(filePath) ? readList(filePath) : [];

    if (list.some(e => e.id === entry.id)) {
      return NextResponse.json({ error: `id already exists: ${entry.id}` }, { status: 409 });
    }

    list.push(entry);
    writeList(filePath, list);
    invalidateAfterWrite(filePath, config.revalidate);
    audit('create', config.label, entry.id as string, getActor(req));

    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PUT: merge updates into existing entry ──────────────────

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ module: string }> },
) {
  const { module } = await params;
  const config = getModuleConfig(module);
  if (!config) {
    return NextResponse.json({ error: `unknown module: ${module}` }, { status: 404 });
  }
  try {
    const body = await req.json();
    const id = body.id as string;
    const updates = body.updates as Record<string, unknown>;
    if (!id || !updates) {
      return NextResponse.json({ error: 'id and updates required' }, { status: 400 });
    }

    const filePath = path.join(getDataDir(), config.file);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'module file not found' }, { status: 404 });
    }
    const list = readList(filePath);
    const idx = list.findIndex(e => e.id === id);
    if (idx < 0) {
      return NextResponse.json({ error: `id not found: ${id}` }, { status: 404 });
    }

    // Prevent id change via PUT
    const { id: _ignoreId, ...safeUpdates } = updates;
    list[idx] = { ...list[idx], ...safeUpdates };

    writeList(filePath, list);
    invalidateAfterWrite(filePath, config.revalidate);
    audit('update', config.label, id, getActor(req));

    return NextResponse.json({ ok: true, entry: list[idx] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── DELETE: remove entry by id ──────────────────────────────

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ module: string }> },
) {
  const { module } = await params;
  const config = getModuleConfig(module);
  if (!config) {
    return NextResponse.json({ error: `unknown module: ${module}` }, { status: 404 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const filePath = path.join(getDataDir(), config.file);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'module file not found' }, { status: 404 });
    }
    const list = readList(filePath);
    const idx = list.findIndex(e => e.id === id);
    if (idx < 0) {
      return NextResponse.json({ error: `id not found: ${id}` }, { status: 404 });
    }

    list.splice(idx, 1);
    writeList(filePath, list);
    invalidateAfterWrite(filePath, config.revalidate);
    audit('delete', config.label, id, getActor(req));

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
