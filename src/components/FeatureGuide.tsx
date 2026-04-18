'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────

export interface GuideStep {
  /** CSS selector for the target element to highlight */
  target: string;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Preferred bubble position relative to the target */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface Props {
  steps: GuideStep[];
  onComplete: () => void;
  onSkip: () => void;
}

// ── Helpers ──────────────────────────────────────────────────

const PAD = 8;  // padding around highlighted element
const BUBBLE_GAP = 12;  // gap between highlight and bubble

function getRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// ── Component ────────────────────────────────────────────────

export default function FeatureGuide({ steps, onComplete, onSkip }: Props) {
  const [current, setCurrent] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubbleStyle, setBubbleStyle] = useState<React.CSSProperties>({});

  const step = steps[current];

  // Measure target element and scroll it into view
  const measure = useCallback(() => {
    if (!step) return;
    const r = getRect(step.target);
    if (r) {
      // Scroll into view if needed
      const el = document.querySelector(step.target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Re-measure after scroll
        requestAnimationFrame(() => {
          const r2 = getRect(step.target);
          setRect(r2);
        });
      }
      setRect(r);
    } else {
      setRect(null);
    }
  }, [step]);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  // Position the bubble after rect + bubble size are known
  useEffect(() => {
    if (!rect || !bubbleRef.current) return;
    const bw = bubbleRef.current.offsetWidth;
    const bh = bubbleRef.current.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const pos = step?.position || 'bottom';
    let top = 0;
    let left = 0;

    if (pos === 'bottom') {
      top = rect.bottom + PAD + BUBBLE_GAP;
      left = rect.left + rect.width / 2 - bw / 2;
    } else if (pos === 'top') {
      top = rect.top - PAD - BUBBLE_GAP - bh;
      left = rect.left + rect.width / 2 - bw / 2;
    } else if (pos === 'right') {
      top = rect.top + rect.height / 2 - bh / 2;
      left = rect.right + PAD + BUBBLE_GAP;
    } else {
      top = rect.top + rect.height / 2 - bh / 2;
      left = rect.left - PAD - BUBBLE_GAP - bw;
    }

    // Keep bubble inside viewport
    top = clamp(top, 8, vh - bh - 8);
    left = clamp(left, 8, vw - bw - 8);

    // If bottom overflows, try top
    if (pos === 'bottom' && top + bh > vh - 8) {
      top = rect.top - PAD - BUBBLE_GAP - bh;
      top = clamp(top, 8, vh - bh - 8);
    }

    setBubbleStyle({ top, left });
  }, [rect, current, step]);

  const next = () => {
    if (current < steps.length - 1) setCurrent(c => c + 1);
    else onComplete();
  };
  const prev = () => { if (current > 0) setCurrent(c => c - 1); };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!step) return null;

  // Highlight box dimensions (with padding)
  const hx = rect ? rect.left - PAD : 0;
  const hy = rect ? rect.top - PAD : 0;
  const hw = rect ? rect.width + PAD * 2 : 0;
  const hh = rect ? rect.height + PAD * 2 : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      {/* Overlay with cutout hole via box-shadow */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'auto',
        }}
        onClick={onSkip}
      >
        {rect && (
          <div
            style={{
              position: 'fixed',
              top: hy,
              left: hx,
              width: hw,
              height: hh,
              borderRadius: 12,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
              transition: 'all 0.3s ease',
              pointerEvents: 'none',
            }}
          />
        )}
        {!rect && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
        )}
      </div>

      {/* Highlighted area click-through */}
      {rect && (
        <div
          style={{
            position: 'fixed',
            top: hy,
            left: hx,
            width: hw,
            height: hh,
            borderRadius: 12,
            border: '2px solid var(--accent)',
            pointerEvents: 'none',
            transition: 'all 0.3s ease',
          }}
        />
      )}

      {/* Bubble card */}
      <div
        ref={bubbleRef}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          ...bubbleStyle,
          width: 340,
          maxWidth: 'calc(100vw - 24px)',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '20px 24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          transition: 'top 0.3s ease, left 0.3s ease',
          pointerEvents: 'auto',
          zIndex: 10000,
        }}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-3">
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === current ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === current ? 'var(--accent)' : 'var(--border)',
                transition: 'all 0.2s',
              }}
            />
          ))}
          <span className="ml-auto text-[11px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>
            {current + 1} / {steps.length}
          </span>
        </div>

        {/* Content */}
        <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--fg)' }}>
          {step.title}
        </h3>
        <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--fg-muted)' }}>
          {step.description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-xs cursor-pointer"
            style={{ color: 'var(--fg-muted)', background: 'none', border: 'none' }}
          >
            跳过引导
          </button>
          <div className="flex gap-2">
            {current > 0 && (
              <button
                onClick={prev}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                style={{
                  background: 'var(--card-hover)',
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                }}
              >
                上一步
              </button>
            )}
            <button
              onClick={next}
              className="px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
              }}
            >
              {current === steps.length - 1 ? '完成' : '下一步'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
