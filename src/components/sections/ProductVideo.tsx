"use client";

import { useState } from "react";

interface Props {
  url: string;
  provider: string | null;
  title: string;
}

type Parsed =
  | { type: "youtube"; id: string; vertical: boolean }
  | { type: "vimeo"; id: string; vertical: boolean }
  | { type: "mp4" };

function parseVideo(url: string, provider: string | null): Parsed {
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/
  );
  // YouTube Shorts are portrait — render them in a 9:16 frame
  if (yt) return { type: "youtube", id: yt[1], vertical: url.includes("/shorts/") };
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { type: "vimeo", id: vimeo[1], vertical: false };
  if (provider === "youtube" || provider === "vimeo") return { type: "mp4" }; // unparseable URL — fall back
  return { type: "mp4" };
}

// Click-to-play facade: no iframe is loaded until the visitor taps play,
// keeping sales pages light on mobile.
export default function ProductVideo({ url, provider, title }: Props) {
  const [playing, setPlaying] = useState(false);
  const parsed = parseVideo(url, provider);

  if (parsed.type === "mp4") {
    // Uploaded videos keep their natural aspect ratio — square stays square,
    // portrait stays portrait — capped so tall videos don't fill the screen
    return (
      <video
        controls
        playsInline
        preload="metadata"
        className="block w-auto h-auto max-w-full max-h-[75vh] mx-auto rounded-2xl bg-black"
        src={url}
      />
    );
  }

  const frameClass = parsed.vertical
    ? "w-full max-w-[360px] mx-auto rounded-2xl overflow-hidden aspect-[9/16] bg-black"
    : "w-full rounded-2xl overflow-hidden aspect-video bg-black";

  if (playing) {
    const embedSrc =
      parsed.type === "youtube"
        ? `https://www.youtube-nocookie.com/embed/${parsed.id}?autoplay=1&playsinline=1&rel=0`
        : `https://player.vimeo.com/video/${parsed.id}?autoplay=1`;
    return (
      <div className={frameClass}>
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
      className={`relative group ${frameClass}`}
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
