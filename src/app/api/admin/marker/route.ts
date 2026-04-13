import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Admin endpoint that rewrites a single marker entry inside
 * `data/markers.json`. Mirrors the shape of /api/admin/disease but operates
 * on a single flat JSON file (markers aren't organ-partitioned).
 */

const EDITABLE_FIELDS = [
  'expertConsensus',
  'literature',
  'references',
  'stainingImages',
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

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

    const filePath = path.join(process.cwd(), 'data', 'markers.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const list = JSON.parse(raw) as Record<string, unknown>[];
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

    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');

    return NextResponse.json({ ok: true, marker: next });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
