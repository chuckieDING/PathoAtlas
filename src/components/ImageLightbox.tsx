'use client';

import { useEffect, useState, useRef } from 'react';
import { IconX } from './Icon';

/**
 * Shared image lightbox for both the disease and marker pages.
 *
 * Features:
 * - Mouse wheel zoom (smooth)
 * - Click & drag to pan when zoomed in
 * - + / − / reset buttons + zoom percentage readout
 * - Keyboard: + / − / 0 / Esc
 * - Touch pinch (basic — two-finger pinch adjusts scale)
 *
 * Kept deliberately self-contained so it can be dropped into any page
 * that wants fullscreen image viewing with zoom.
 */
export function ImageLightbox({
  image,
  onClose,
}: {
  image: { url: string; caption: string };
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);

  const MIN = 0.5;
  const MAX = 6;
  const STEP = 0.25;

  const clamp = (n: number) => Math.max(MIN, Math.min(MAX, n));
  const zoomIn = () => setScale((s) => clamp(s + STEP));
  const zoomOut = () => {
    setScale((s) => {
      const next = clamp(s - STEP);
      // Re-center when zoomed back to 1x so the image sits neatly.
      if (next <= 1) {
        setTx(0);
        setTy(0);
      }
      return next;
    });
  };
  const reset = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  // Reset viewport whenever a new image loads.
  useEffect(() => {
    reset();
  }, [image.url]);

  // Lock body scroll while lightbox is open, prevent background scroll
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    // Compensate for scrollbar disappearance to prevent layout shift
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Non-passive wheel listener so preventDefault works.
  // React's onWheel prop is passive in React 17+, which means
  // e.preventDefault() is a no-op and the page scrolls behind the lightbox.
  const wheelContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wheelContainerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -STEP : STEP;
      setScale((s) => clamp(s + delta));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Click & drag to pan — only active when zoomed in.
  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx, ty };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setTx(dragStart.current.tx + (e.clientX - dragStart.current.x));
    setTy(dragStart.current.ty + (e.clientY - dragStart.current.y));
  };
  const stopDrag = () => setDragging(false);

  // Basic pinch-to-zoom for touch devices.
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchStart.current = { dist, scale };
    } else if (e.touches.length === 1 && scale > 1) {
      setDragging(true);
      const t = e.touches[0];
      dragStart.current = { x: t.clientX, y: t.clientY, tx, ty };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const next = clamp((dist / pinchStart.current.dist) * pinchStart.current.scale);
      setScale(next);
    } else if (e.touches.length === 1 && dragging) {
      const t = e.touches[0];
      setTx(dragStart.current.tx + (t.clientX - dragStart.current.x));
      setTy(dragStart.current.ty + (t.clientY - dragStart.current.y));
    }
  };
  const onTouchEnd = () => {
    pinchStart.current = null;
    setDragging(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-scale-in"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      role="dialog"
      aria-modal="true"
    >
      {/* Toolbar (top center) */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full px-3 py-1.5 z-10"
        style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <ToolButton onClick={zoomOut} disabled={scale <= MIN} label="缩小">−</ToolButton>
        <span className="text-xs min-w-[52px] text-center tabular-nums select-none" style={{ color: '#fff' }}>
          {Math.round(scale * 100)}%
        </span>
        <ToolButton onClick={zoomIn} disabled={scale >= MAX} label="放大">+</ToolButton>
        <span className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.2)' }} />
        <button
          onClick={reset}
          className="text-[11px] px-2 py-1 rounded"
          style={{ color: '#fff', background: scale === 1 && tx === 0 && ty === 0 ? 'transparent' : 'rgba(255,255,255,0.12)' }}
        >
          重置
        </button>
      </div>

      {/* Close button (top right) */}
      <button
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center z-10"
        style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="关闭"
      >
        <IconX size={20} />
      </button>

      {/* Image container */}
      <figure
        className="max-w-full max-h-full flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={wheelContainerRef}
          className="flex items-center justify-center"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
            touchAction: 'none',
            width: '92vw',
            height: '78vh',
            overflow: 'hidden',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.caption}
            className="select-none rounded-lg"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: dragging ? 'none' : 'transform 0.15s ease-out',
              background: '#fff',
            }}
            draggable={false}
            referrerPolicy="no-referrer"
            onError={(e) => {
              const img = e.currentTarget;
              img.style.minWidth = '300px';
              img.style.minHeight = '200px';
            }}
          />
        </div>
        <figcaption className="mt-3 text-center text-sm max-w-[92vw] px-4" style={{ color: '#e4e4e7' }}>
          {image.caption}
        </figcaption>
      </figure>

      {/* Shortcut hint (bottom center) */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] select-none px-3 py-1 rounded-full"
        style={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(0,0,0,0.4)' }}
      >
        滚轮缩放 · 拖拽平移 · + / − / 0 快捷键 · Esc 关闭
      </div>
    </div>
  );
}

function ToolButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-7 h-7 rounded flex items-center justify-center text-sm font-semibold transition-opacity"
      style={{
        color: '#fff',
        background: disabled ? 'transparent' : 'rgba(255,255,255,0.12)',
        opacity: disabled ? 0.3 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}
