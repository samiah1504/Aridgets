"use client";

import { useState, useEffect, useRef } from "react";
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

type AddMode = "upload" | "url";

export default function MediaManager({ productId }: Props) {
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-form state
  const [addMode, setAddMode] = useState<AddMode>("upload");
  const [addSlot, setAddSlot] = useState<MediaSlot>("gallery");
  const [addAlt, setAddAlt] = useState("");

  // URL-mode only
  const [addKind, setAddKind] = useState<MediaKind>("image");
  const [addProvider, setAddProvider] = useState<MediaProvider>("youtube");
  const [addUrl, setAddUrl] = useState("");

  const [uploading, setUploading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Upload ──────────────────────────────────────────────────────────────────

  async function handleFileUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Only image files (JPEG, PNG, WebP, GIF, AVIF) can be uploaded.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum size is 10 MB.");
      return;
    }

    setUploading(true);
    setError("");

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("product-media")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("product-media")
      .getPublicUrl(path);

    const { error: dbError } = await supabase.from("product_media").insert({
      product_id: productId,
      kind: "image" as MediaKind,
      url: publicUrl,
      provider: "upload" as MediaProvider,
      slot: addSlot,
      sort_order: media.length,
      alt: addAlt.trim() || null,
    });

    if (dbError) {
      setError(dbError.message);
    } else {
      setAddAlt("");
      await load();
    }

    setUploading(false);
  }

  // ── Add by URL ──────────────────────────────────────────────────────────────

  async function addByUrl() {
    if (!addUrl.trim()) { setError("URL is required."); return; }
    setAdding(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.from("product_media").insert({
      product_id: productId,
      kind: addKind,
      url: addUrl.trim(),
      provider: addKind === "video" ? addProvider : ("upload" as MediaProvider),
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

  // ── Drag & Drop ─────────────────────────────────────────────────────────────

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }
  function onDragLeave() { setDragOver(false); }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  // ── Existing media management ───────────────────────────────────────────────

  async function deleteMedia(id: string, url: string, provider: MediaProvider | null) {
    if (!confirm("Remove this media item?")) return;
    const supabase = createClient();

    // If it was uploaded to Supabase Storage, delete the object too
    if (provider === "upload") {
      const { data: { publicUrl: base } } = supabase.storage
        .from("product-media")
        .getPublicUrl("");
      const prefix = base.replace(/\/$/, "");
      if (url.startsWith(prefix)) {
        const storagePath = url.slice(prefix.length + 1); // strip leading "/"
        await supabase.storage.from("product-media").remove([storagePath]);
      }
    }

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

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <p className="text-sm text-gray-400 py-4">Loading…</p>;

  return (
    <div className="space-y-6">
      {/* ── Add media ── */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Add Media</h3>
          {/* Mode toggle */}
          <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => { setAddMode("upload"); setError(""); }}
              className={`px-3 py-1 rounded-md transition ${
                addMode === "upload" ? "bg-white shadow text-gray-800" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Upload
            </button>
            <button
              onClick={() => { setAddMode("url"); setError(""); }}
              className={`px-3 py-1 rounded-md transition ${
                addMode === "url" ? "bg-white shadow text-gray-800" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              From URL
            </button>
          </div>
        </div>

        {/* Slot selector (shared) */}
        <div className="flex items-center gap-2">
          <select
            value={addSlot}
            onChange={(e) => setAddSlot(e.target.value as MediaSlot)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white outline-none"
          >
            <option value="gallery">Gallery</option>
            <option value="hero">Hero</option>
          </select>
          <input
            type="text"
            value={addAlt}
            onChange={(e) => setAddAlt(e.target.value)}
            placeholder="Alt text / caption (optional)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          />
        </div>

        {/* ── Upload mode ── */}
        {addMode === "upload" && (
          <>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { handleFileUpload(file); e.target.value = ""; }
              }}
            />
            {/* Drop zone */}
            <div
              onClick={() => { if (!uploading) fileInputRef.current?.click(); }}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`relative w-full border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer ${
                dragOver
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
              } ${uploading ? "pointer-events-none" : ""}`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <svg className="animate-spin w-6 h-6 text-indigo-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 100 24v-4l-3 3 3 3v4A12 12 0 014 12z" />
                  </svg>
                  <p className="text-sm text-indigo-600 font-medium">Uploading…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4m0 0l4 4m-4-4v9M20 16l-4-4m0 0l-4 4m4-4V7a4 4 0 00-4-4H8a4 4 0 00-4 4v4" />
                  </svg>
                  <p className="text-sm font-medium text-gray-600">
                    Drag &amp; drop an image here or{" "}
                    <span className="text-indigo-600 underline">browse</span>
                  </p>
                  <p className="text-xs">JPEG · PNG · WebP · GIF · AVIF · max 10 MB</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── URL mode ── */}
        {addMode === "url" && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <select
                value={addKind}
                onChange={(e) => { setAddKind(e.target.value as MediaKind); setAddProvider("youtube"); }}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white outline-none"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
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
            <div className="flex gap-2">
              <input
                type="url"
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                placeholder={
                  addKind === "video"
                    ? "https://youtube.com/watch?v=…"
                    : "https://… image URL"
                }
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
              />
              <button
                onClick={addByUrl}
                disabled={adding}
                className="bg-indigo-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition disabled:opacity-60 shrink-0"
              >
                {adding ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* ── Media list ── */}
      {media.length === 0 ? (
        <p className="text-sm text-gray-400">No media yet. Upload an image above.</p>
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
                  {item.provider === "upload" && (
                    <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded">
                      uploaded
                    </span>
                  )}
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
                  onClick={() => deleteMedia(item.id, item.url, item.provider)}
                  className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 transition rounded text-xl leading-none"
                  title="Delete"
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
