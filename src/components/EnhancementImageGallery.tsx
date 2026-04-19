/**
 * Image gallery for enhancement-pipeline-supplied caption sets.
 *
 * Background: the data enhancement pipeline (scripts/enhance/) populates
 * caption text for medical images, but the actual SVGs/photos are not yet
 * uploaded. URLs in the data look like `/cases/case-001/lp-he.svg` —
 * placeholders pointing at files that don't exist on disk.
 *
 * Rather than render broken `<img>` tags, this component shows each item as
 * a captioned tile with a "图片待补充" (image pending) marker when the
 * referenced asset isn't reachable. Hosts (cases / frozen / stains / cyto)
 * pass in items + an optional badge classifier so frozen-section
 * "false-positive" / "false-negative" / "artifact" trap types can be
 * color-coded inline.
 */
'use client';

import { useEffect, useState } from 'react';

export interface EnhancementImageItem {
  url?: string;
  caption: string;
  /** Free-form badge text shown on the tile (e.g. "false-negative",
   *  "gross", "LP"). Renderer maps known values to a color. */
  badge?: string;
}

interface Props {
  title: string;
  items: EnhancementImageItem[];
  /** Optional accent color for the section header. Default = green. */
  accent?: string;
  /** Map badge value → tint color for the badge background. */
  badgeColors?: Record<string, string>;
}

const DEFAULT_BADGE_COLORS: Record<string, string> = {
  // Frozen pitfall trap types
  'false-positive': '#ef4444',
  'false-negative': '#f59e0b',
  'artifact': '#6b7280',
  // Case image categories
  'gross': '#8b5cf6',
  'LP': '#3b82f6',
  'HP': '#0ea5e9',
  'IHC': '#10b981',
  // Special stain states
  'pos': '#10b981',
  'neg': '#ef4444',
  'pos-diastase': '#06b6d4',
};

export default function EnhancementImageGallery({
  title,
  items,
  accent = '#10b981',
  badgeColors,
}: Props) {
  if (items.length === 0) return null;
  const colorMap = { ...DEFAULT_BADGE_COLORS, ...(badgeColors || {}) };

  return (
    <section
      className="rounded-xl p-5"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <h3
        className="font-semibold text-sm mb-3 flex items-center gap-2"
        style={{ color: accent }}
      >
        <span aria-hidden>🖼️</span>
        {title}
        <span
          className="text-[10px] tabular-nums px-1.5 py-0.5 rounded"
          style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}
        >
          {items.length}
        </span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, i) => (
          <Tile key={i} item={item} colorMap={colorMap} />
        ))}
      </div>
    </section>
  );
}

function Tile({
  item,
  colorMap,
}: {
  item: EnhancementImageItem;
  colorMap: Record<string, string>;
}) {
  // HEAD-probe the URL once to decide whether to show the image or the
  // "图片待补充" placeholder. Avoids a flicker of broken-image icon.
  const [exists, setExists] = useState<boolean | null>(item.url ? null : false);
  useEffect(() => {
    if (!item.url) return;
    let cancelled = false;
    fetch(item.url, { method: 'HEAD' })
      .then((r) => {
        if (!cancelled) setExists(r.ok);
      })
      .catch(() => !cancelled && setExists(false));
    return () => {
      cancelled = true;
    };
  }, [item.url]);

  const badgeColor = item.badge ? colorMap[item.badge] : undefined;
  return (
    <div
      className="rounded-lg overflow-hidden flex flex-col"
      style={{ background: 'var(--card-hover)', border: '1px solid var(--border)' }}
    >
      <div
        className="aspect-video flex items-center justify-center text-center px-3"
        style={{ background: 'var(--bg)' }}
      >
        {exists === true && item.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.caption}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
            <span style={{ opacity: 0.5 }}>图片待补充</span>
            <div className="mt-1 font-mono text-[10px] break-all" style={{ opacity: 0.4 }}>
              {item.url}
            </div>
          </div>
        )}
      </div>
      <div className="p-2.5">
        {item.badge && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded mr-1.5 inline-block mb-1"
            style={{
              background: badgeColor ? `${badgeColor}1f` : 'var(--card)',
              color: badgeColor || 'var(--fg-muted)',
            }}
          >
            {item.badge}
          </span>
        )}
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--fg)' }}>
          {item.caption}
        </p>
      </div>
    </div>
  );
}
