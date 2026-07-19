"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import { formatNGN } from "@/lib/utils/currency";
import type { ProductTheme } from "@/types";
import {
  archiveProduct,
  restoreProduct,
  deleteProduct,
  duplicateProduct,
  setProductStatus,
} from "@/app/admin/(protected)/products/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductMedia = { url: string; slot: string; kind: string; sort_order: number };

export type EnrichedProduct = {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "live" | "archived";
  price: number;
  compare_at_price: number | null;
  theme: ProductTheme;
  pixel_id: string | null;
  updated_at: string;
  created_at: string;
  product_media: ProductMedia[] | null;
  leadCount: number;
  paidCount: number;
};

type SortKey = "newest" | "oldest" | "updated" | "price_high" | "price_low" | "alpha";
type FilterKey = "all" | "live" | "draft" | "archived";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60_000);
  if (m < 2) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

function sortProducts(list: EnrichedProduct[], sort: SortKey): EnrichedProduct[] {
  return [...list].sort((a, b) => {
    switch (sort) {
      case "newest":     return +new Date(b.created_at) - +new Date(a.created_at);
      case "oldest":     return +new Date(a.created_at) - +new Date(b.created_at);
      case "updated":    return +new Date(b.updated_at) - +new Date(a.updated_at);
      case "price_high": return b.price - a.price;
      case "price_low":  return a.price - b.price;
      case "alpha":      return a.name.localeCompare(b.name);
    }
  });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS = {
  live:     { label: "Live",     dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", pill: "bg-emerald-50 text-emerald-700", emoji: "🟢" },
  draft:    { label: "Draft",    dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200",       pill: "bg-amber-50 text-amber-700",     emoji: "🟡" },
  archived: { label: "Archived", dot: "bg-gray-400",    badge: "bg-gray-100 text-gray-500 border-gray-200",         pill: "bg-gray-100 text-gray-600",       emoji: "⚫" },
} as const;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "live",     label: "Live" },
  { key: "draft",    label: "Draft" },
  { key: "archived", label: "Archived" },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest",     label: "Newest" },
  { key: "oldest",     label: "Oldest" },
  { key: "updated",    label: "Recently updated" },
  { key: "price_high", label: "Highest price" },
  { key: "price_low",  label: "Lowest price" },
  { key: "alpha",      label: "A → Z" },
];

// ─── MoreMenu ─────────────────────────────────────────────────────────────────

function MoreMenu({
  product,
  onClose,
}: {
  product: EnrichedProduct;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  function run(action: (id: string) => Promise<void>) {
    startTransition(async () => {
      await action(product.id);
      onClose();
    });
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    onClose();
  }

  const isArchived = product.status === "archived";

  return (
    <div
      ref={ref}
      className="absolute bottom-full right-0 mb-2 z-50 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
    >
      <div className="py-1">
        <button
          disabled={isPending}
          onClick={() => run(duplicateProduct)}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
        >
          <span className="text-base">📋</span>
          <span>Duplicate product</span>
        </button>

        {isArchived ? (
          <button
            disabled={isPending}
            onClick={() => run(restoreProduct)}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition disabled:opacity-50"
          >
            <span className="text-base">✅</span>
            <span>Restore to Draft</span>
          </button>
        ) : (
          <button
            disabled={isPending}
            onClick={() => run(archiveProduct)}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition disabled:opacity-50"
          >
            <span className="text-base">📦</span>
            <span>Archive product</span>
          </button>
        )}

        <button
          disabled={isPending}
          onClick={() => {
            if (window.confirm(`Delete "${product.name}"?\n\nThis cannot be undone.`)) {
              run(deleteProduct);
            }
          }}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition disabled:opacity-50"
        >
          <span className="text-base">🗑️</span>
          <span>Delete product</span>
        </button>

        <div className="border-t border-gray-100 my-1" />

        <button
          onClick={() => copy(`${window.location.origin}/p/${product.slug}`)}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
        >
          <span className="text-base">🔗</span>
          <span>Copy landing page URL</span>
        </button>

        <button
          onClick={() => copy(product.slug)}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
        >
          <span className="text-base font-mono text-gray-500">#</span>
          <span>Copy product slug</span>
        </button>
      </div>
    </div>
  );
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: EnrichedProduct }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const [toggling, startToggle] = useTransition();

  const media = (product.product_media ?? [])
    .filter((m) => m.kind === "image")
    .sort((a, b) => a.sort_order - b.sort_order);
  const heroImage = media.find((m) => m.slot === "hero")?.url ?? media[0]?.url ?? null;

  const cfg = STATUS[product.status] ?? STATUS.draft;
  const conversion = product.leadCount > 0
    ? Math.round((product.paidCount / product.leadCount) * 100)
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
      {/* Hero image */}
      <div className="aspect-[4/3] bg-gray-50 overflow-hidden rounded-t-2xl relative">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium text-gray-300">No image</span>
          </div>
        )}

        {/* Status badge */}
        <span className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">

        {/* Name + timestamp */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-bold text-gray-900 leading-snug line-clamp-2 text-[15px]">
            {product.name}
          </h2>
          <span className="text-[11px] text-gray-400 whitespace-nowrap mt-0.5 shrink-0">
            {relativeDate(product.updated_at)}
          </span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold text-gray-900 tracking-tight">
            {formatNGN(product.price)}
          </span>
          {product.compare_at_price != null && product.compare_at_price > product.price && (
            <span className="text-sm text-gray-400 line-through">
              {formatNGN(product.compare_at_price)}
            </span>
          )}
        </div>

        {/* Slug */}
        <p className="text-[11px] font-mono text-gray-400 -mt-1">/{product.slug}</p>

        {/* Info chips */}
        <div className="flex flex-wrap gap-1.5">
          {product.pixel_id && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Pixel
            </span>
          )}
          {product.theme?.primary && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white shadow-sm shrink-0"
                style={{ background: product.theme.primary }}
              />
              Theme
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
            📞 {product.leadCount} leads
          </span>
          {conversion !== null && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              📈 {conversion}%
            </span>
          )}
        </div>

        {/* Live / Draft toggle */}
        {product.status !== "archived" && (
          <button
            disabled={toggling}
            onClick={() =>
              startToggle(() =>
                setProductStatus(
                  product.id,
                  product.status === "live" ? "draft" : "live"
                )
              )
            }
            className={`w-full py-2 rounded-xl text-sm font-bold tracking-wide transition disabled:opacity-60 ${
              product.status === "live"
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-200"
            }`}
          >
            {toggling
              ? "Updating…"
              : product.status === "live"
              ? "↩ Set to Draft"
              : "⚡ Go Live"}
          </button>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
          <a
            href={`/p/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0 text-center text-xs font-medium py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition"
          >
            View ↗
          </a>
          <Link
            href={`/admin/products/${product.id}`}
            className="flex-1 min-w-0 text-center text-xs font-semibold py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            Edit
          </Link>
          <Link
            href={`/admin/leads?product=${product.id}`}
            className="flex-1 min-w-0 text-center text-xs font-medium py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition"
          >
            Leads
          </Link>
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="More actions"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition text-lg leading-none"
            >
              ⋮
            </button>
            {menuOpen && <MoreMenu product={product} onClose={closeMenu} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ProductsGrid (default export) ───────────────────────────────────────────

export default function ProductsGrid({ products }: { products: EnrichedProduct[] }) {
  const [query, setQuery]   = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort]     = useState<SortKey>("newest");

  const counts = {
    live:     products.filter((p) => p.status === "live").length,
    draft:    products.filter((p) => p.status === "draft").length,
    archived: products.filter((p) => p.status === "archived").length,
  };

  const visible = sortProducts(
    products.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
      }
      return true;
    }),
    sort
  );

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Products</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {(["live", "draft", "archived"] as const).map((s) =>
              counts[s] > 0 ? (
                <button
                  key={s}
                  onClick={() => setFilter(filter === s ? "all" : s)}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition ${
                    filter === s ? "ring-2 ring-offset-1 ring-indigo-400" : ""
                  } ${STATUS[s].pill}`}
                >
                  {STATUS[s].emoji} {STATUS[s].label} ({counts[s]})
                </button>
              ) : null
            )}
          </div>
        </div>
        <Link
          href="/admin/products/new"
          className="shrink-0 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition shadow-sm"
        >
          + New product
        </Link>
      </div>

      {/* ── Toolbar: search + filters + sort ── */}
      <div className="space-y-3">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                  filter === f.key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="shrink-0 text-xs font-medium border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Content ── */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center text-5xl shadow-inner">
            🛍️
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">No products yet</p>
            <p className="text-sm text-gray-500 mt-1.5">Create your first product and start selling.</p>
          </div>
          <Link
            href="/admin/products/new"
            className="bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 transition shadow-sm"
          >
            Create your first product
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="text-5xl">🔍</div>
          <div>
            <p className="font-bold text-gray-800">No products match</p>
            <p className="text-sm text-gray-400 mt-1">Try a different search or filter.</p>
          </div>
          <button
            onClick={() => { setQuery(""); setFilter("all"); }}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400">
            {visible.length} product{visible.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
