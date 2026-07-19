import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatNGN } from "@/lib/utils/currency";
import type { ProductContent } from "@/types";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "Crift Shop",
  description: "Browse our products and place your order today.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  // Supabase sends invite/magic-link codes to the Site URL — forward to the callback handler
  if (typeof sp.code === "string") {
    redirect(`/auth/callback?code=${encodeURIComponent(sp.code)}`);
  }

  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, slug, price, compare_at_price, content, product_media(url, slot, kind, sort_order), product_variants(price_override, active)"
    )
    .eq("status", "live")
    .eq("show_on_homepage", true)
    .order("created_at", { ascending: false });

  const storeName = process.env.NEXT_PUBLIC_APP_NAME ?? "Crift Shop";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">
          <span className="font-extrabold text-gray-900 tracking-tight">{storeName}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {!products?.length ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-lg font-medium">No products available right now.</p>
            <p className="text-sm mt-1">Check back soon.</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Our Products</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => {
                const content = p.content as ProductContent;
                const media = (
                  p.product_media as Array<{
                    url: string;
                    slot: string;
                    kind: string;
                    sort_order: number;
                  }>
                )
                  ?.filter((m) => m.kind === "image")
                  .sort((a, b) => a.sort_order - b.sort_order);

                const heroImage =
                  media?.find((m) => m.slot === "hero")?.url ??
                  media?.[0]?.url ??
                  null;

                const tagline =
                  content?.eyebrow ?? content?.subhead ?? content?.headline ?? null;

                const variantPrices = (
                  p.product_variants as Array<{ price_override: number | null; active: boolean }> | null
                )
                  ?.filter((v) => v.active && v.price_override !== null)
                  .map((v) => v.price_override as number) ?? [];

                const minVariantPrice =
                  variantPrices.length > 0 ? Math.min(...variantPrices) : null;
                const displayPrice = minVariantPrice ?? p.price;
                const pricePrefix = minVariantPrice !== null ? "From " : "";

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                  >
                    {/* Hero image */}
                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                      {heroImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={heroImage}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
                          🛍️
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="p-4 flex flex-col flex-1">
                      <h2 className="font-bold text-gray-900 text-base leading-snug">
                        {p.name}
                      </h2>
                      {tagline && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{tagline}</p>
                      )}

                      {/* Price */}
                      <div className="flex items-baseline gap-2 mt-3">
                        <span className="text-lg font-bold text-gray-900">
                          {pricePrefix}{formatNGN(displayPrice)}
                        </span>
                        {!minVariantPrice && p.compare_at_price && p.compare_at_price > p.price && (
                          <span className="text-sm text-gray-400 line-through">
                            {formatNGN(p.compare_at_price)}
                          </span>
                        )}
                      </div>

                      {/* CTA */}
                      <div className="mt-auto pt-4">
                        <Link
                          href={`/p/${p.slug}`}
                          className="block w-full text-center bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-700 transition"
                        >
                          View Product
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
