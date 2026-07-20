import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/config";

// Rendered on demand so newly published products appear without a redeploy
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const service = createServiceClient();
  const { data: products } = await service
    .from("products")
    .select("slug, updated_at")
    .eq("status", "live");

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...(products ?? []).map((p) => ({
      url: `${SITE_URL}/p/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
