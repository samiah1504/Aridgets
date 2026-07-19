"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MediaKind, MediaProvider, MediaSlot } from "@/types";

interface MediaRow {
  id: string;
  kind: MediaKind;
  url: string;
  provider: MediaProvider | null;
  slot: MediaSlot;
  sort_order: number;
  alt: string | null;
}

interface Props {
  productId: string;
}

export default function MediaManager({ productId }: Props) {
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addKind, setAddKind] = useState<MediaKind>("image");
  const [addUrl, setAddUrl] = useState("");
  const [addSlot, setAddSlot] = useState<MediaSlot>("gallery");
  const [addProvider, setAddProvider] = useState<MediaProvider>("upload");
  const [addAlt, setAddAlt] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [productId]);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("product_media")
      .select("id, kind, url, provider, slot, sort_order, alt")
      .eq("product_id", productId)
      .order("sort_order");
    setMedia((data as MediaRow[]) ?? []);
    setLoading(false);
  }

  async function addMedia() {
    if (!addUrl.trim()) { setError("URL is required."); return; }
    setAdding(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.from("product_media").insert({
      product_id: productId,
      kind: addKind,
      url: addUrl.trim(),
      provider: addKind === "video" ? addProvider : "upload",
      slot: addSlot,
      sort_order: media.length,
      alt: addAlt.trim() || null,
    });
    if (err) {
      setError(err.message);
    } else {
      setAddUrl("");
      setAddAlt("");
      await load();
    }
    setAdding(false);
  }

  async function deleteMedia(id: string) {
    if (!confirm("Remove this media item?")) return;
    const supabase = createClient();
    await supabase.from("product_media").delete().eq("id", id);
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }

  async function updateSlot(id: string, slot: MediaSlot) {
    const supabase = createClient();
    await supabase.from("product_media").update({ slot }).eq("id", id);
    setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, slot } : m)));
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    const items = [...media];
    [items[index], items[target]] = [items[target], items[index]];
    const updated = items.map((item, i) => ({ ...item, sort_order: i }));
    setMedia(updated);
    const supabase = createClient();
    await Promise.all(
      updated.map((item) =>
        supabase.from("product_media").update({ sort_order: item.sort_order }).eq("id", item.id)
      )
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <p className="text-sm text-gray-400 py-4">Loading…</p>;

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Add Media</h3>

        <div className="flex flex-wrap gap-2">
          <select
            value={addKind}
            onChange={(e) => {
              setAddKind(e.target.value as MediaKind);
              setAddProvider("upload");
            }}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white outline-none"
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>

          <select
            value={addSlot}
            onChange={(e) => setAddSlot(e.target.value as MediaSlot)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white outline-none"
          >
            <option value="gallery">Gallery</option>
            <option value="hero">Hero</option>
          </select>

          {addKind === "video" && (
            <select
              value={addProvider}
              onChange={(e) => setAddProvider(e.target.value as MediaProvider)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white outline-none"
            >
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="mp4">MP4</option>
            </select>
          )}
        </div>

        <input
          type="url"
          value={addUrl}
          onChange={(e) => setAddUrl(e.target.value)}
          placeholder={
            addKind === "video"
              ? "https://youtube.com/watch?v=… or mp4 URL"
              : "https://… image URL"
          }
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
        />

        <input
          type="text"
          value={addAlt}
          onChange={(e) => setAddAlt(e.target.value)}
          placeholder="Alt text / caption (optional)"
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
        />

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={addMedia}
          disabled={adding}
          className="bg-indigo-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition disabled:opacity-60"
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </div>

      {/* Media list */}
      {media.length === 0 ? (
        <p className="text-sm text-gray-400">
          No media yet. Add images or videos above.
        </p>
      ) : (
        <div className="space-y-2">
          {media.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl"
            >
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {item.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.alt ?? ""}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
                    ▶
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 truncate">{item.url}</p>
                {item.alt && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{item.alt}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 capitalize">
                    {item.kind}
                  </span>
                  <select
                    value={item.slot}
                    onChange={(e) => updateSlot(item.id, e.target.value as MediaSlot)}
                    className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white outline-none"
                  >
                    <option value="gallery">Gallery</option>
                    <option value="hero">Hero</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-25 transition rounded"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(index, 1)}
                  disabled={index === media.length - 1}
                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-25 transition rounded"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={() => deleteMedia(item.id)}
                  className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 transition rounded text-xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
