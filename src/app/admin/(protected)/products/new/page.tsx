"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_SLUG_RE = /[^a-z0-9-]/g;

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(v: string) {
    setName(v);
    setSlug(v.toLowerCase().replace(/\s+/g, "-").replace(DEFAULT_SLUG_RE, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsedPrice = parseFloat(price);
    if (!name.trim()) return setError("Product name is required.");
    if (!slug.trim()) return setError("Slug is required.");
    if (isNaN(parsedPrice) || parsedPrice <= 0) return setError("Enter a valid price.");

    setSaving(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("products")
      .insert({ name: name.trim(), slug: slug.trim(), price: parsedPrice })
      .select("id")
      .single();

    if (err || !data) {
      setError(err?.message ?? "Failed to create product.");
      setSaving(false);
      return;
    }

    router.push(`/admin/products/${data.id}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-900 mb-6">New product</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Posture Corrector Pro"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slug
          </label>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
            <span className="bg-gray-50 px-3 py-2 text-sm text-gray-400 border-r border-gray-200 shrink-0">
              /p/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(DEFAULT_SLUG_RE, ""))
              }
              placeholder="posture-corrector-pro"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="flex-1 px-3 py-2 text-sm focus:outline-none"
              required
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Lowercase letters, numbers, and hyphens only.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price (₦)
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="5000"
            min="1"
            step="1"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create product"}
          </button>
          <Link
            href="/admin/products"
            className="text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
