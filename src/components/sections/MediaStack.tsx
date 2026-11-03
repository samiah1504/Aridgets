"use client";

import { useEffect, useState } from "react";
import ProductVideo from "./ProductVideo";

// Every picture and video shown on its own, full width and uncropped (its
// natural shape), one under another. Tapping a picture opens it full screen
// with next/previous, so customers can study the details (pinch to zoom).

export interface StackMediaItem {
  id: string;
  url: string;
  alt: string | null;
  kind: string;
  provider?: string | null;
}

interface Props {
  items: StackMediaItem[];
  productName: string;
  /** Load the first picture straight away (top of the page) */
  eager?: boolean;
}

export default function MediaStack({ items, productName, eager }: Props) {
  const images = items.filter((m) => m.kind === "image");
  const viewerIndex = new Map(images.map((m, i) => [m.id, i]));
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, images.length]);

  if (!items.length) return null;

  return (
    <>
      <div className="space-y-4">
        {items.map((m, i) => {
          if (m.kind !== "image") {
            return <ProductVideo key={m.id} url={m.url} provider={m.provider ?? null} title={m.alt ?? productName} />;
          }
          const idx = viewerIndex.get(m.id) ?? 0;
          return (
            <figure key={m.id}>
              <button
                type="button"
                onClick={() => setOpen(idx)}
                className="block w-full sp-rounded overflow-hidden sp-surface cursor-zoom-in"
                aria-label={`View ${m.alt || `picture ${idx + 1}`} full screen`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={m.alt ?? productName}
                  loading={eager && i === 0 ? "eager" : "lazy"}
                  className="block w-full h-auto"
                />
              </button>
              {m.alt && <figcaption className="mt-1.5 text-center text-xs sp-muted">{m.alt}</figcaption>}
            </figure>
          );
        })}
      </div>

      {open !== null && images[open] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Picture viewer"
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
          onClick={() => setOpen(null)}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white text-sm">
            <span>{open + 1} / {images.length}</span>
            <button type="button" onClick={() => setOpen(null)} className="w-11 h-11 text-2xl leading-none" aria-label="Close">
              ✕
            </button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center px-2 touch-pinch-zoom">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[open].url}
              alt={images[open].alt ?? productName}
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          {images.length > 1 && (
            <div className="flex justify-center gap-6 py-4" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setOpen((open - 1 + images.length) % images.length)}
                className="w-12 h-12 rounded-full bg-white/15 text-white text-2xl"
                aria-label="Previous picture"
              >‹</button>
              <button
                type="button"
                onClick={() => setOpen((open + 1) % images.length)}
                className="w-12 h-12 rounded-full bg-white/15 text-white text-2xl"
                aria-label="Next picture"
              >›</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
