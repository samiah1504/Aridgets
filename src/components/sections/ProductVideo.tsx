"use client";

import { useState } from "react";

interface Props {
  url: string;
  provider: string | null;
  title: string;
}

type Parsed =
  | { type: "youtube"; id: string }
  | { type: "vimeo"; id: string }
  | { type: "mp4" };

function parseVideo(url: string, provider: string | null): Parsed {
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/
  );
  if (yt) return { type: "youtube", id: yt[1] };
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { type: "vimeo", id: vimeo[1] };
  if (provider === "youtube" || provider === "vimeo") return { type: "mp4" }; // unparseable URL — fall back
  return { type: "mp4" };
}

// Click-to-play facade: no iframe is loaded until the visitor taps play,
// keeping sales pages light on mobile.
export default function ProductVideo({ url, provider, title }: Props) {
  const [playing, setPlaying] = useState(false);
  const parsed = parseVideo(url, provider);

  if (parsed.type === "mp4") {
    return (
      <video
        controls
        playsInline
        preload="metadata"
        className="w-full rounded-2xl aspect-video bg-black"
        src={url}
      />
    );
  }

  if (playing) {
    const embedSrc =
      parsed.type === "youtube"
        ? `https://www.youtube-nocookie.com/embed/${parsed.id}?autoplay=1&playsinline=1&rel=0`
        : `https://player.vimeo.com/video/${parsed.id}?autoplay=1`;
    return (
      <div className="w-full rounded-2xl overflow-hidden aspect-video bg-black">
        <iframe
          src={embedSrc}
          title={title}
          className="w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const thumbnail =
    parsed.type === "youtube"
      ? `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`
      : null;

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${title}`}
      className="relative w-full rounded-2xl overflow-hidden aspect-video bg-gray-900 group"
    >
      {thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}
      <span className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-16 h-16 rounded-full bg-white/95 shadow-lg flex items-center justify-center group-hover:scale-105 transition-transform">
          <span className="ml-1 w-0 h-0 border-y-[11px] border-y-transparent border-l-[18px] border-l-gray-900" />
        </span>
      </span>
    </button>
  );
}
