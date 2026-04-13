import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Admin endpoint that rewrites a single disease entry inside
 * `data/diseases/<organ>.json`. Only the fields that typically need curation
 * from the admin UI are accepted — the rest of the record is preserved.
 *
 * Intentionally unauthenticated: this is a single-tenant editorial tool. If
 * you deploy it publicly, front it with a proxy that gates write methods.
 */

const EDITABLE_FIELDS = [
  'grossPathology',
  'grossDescription',
  'microscopy',
  'images',
  'microscopyImages',
  'grossImages',
  'expertConsensus',
  'literature',
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

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

    const filePath = path.join(process.cwd(), 'data', 'diseases', `${organ}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `organ file not found: ${organ}` }, { status: 404 });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const list = JSON.parse(raw) as Record<string, unknown>[];
    const idx = list.findIndex((d) => d.id === id);
    if (idx < 0) {
      return NextResponse.json({ error: `disease not found: ${id}` }, { status: 404 });
    }

    const next = { ...list[idx] };
    for (const key of EDITABLE_FIELDS) {
      if (key in updates) {
        next[key] = updates[key];
      }
    }
    list[idx] = next;

    // Pretty write keeps diffs readable in git.
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');

    return NextResponse.json({ ok: true, disease: next });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
