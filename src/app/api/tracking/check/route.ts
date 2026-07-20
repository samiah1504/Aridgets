import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/auth";
import { hasAnyPerm } from "@/lib/permissions";

const API_VERSION = process.env.META_GRAPH_API_VERSION ?? "v21.0";

export interface DiagnosticResult {
  key: string;
  label: string;
  ok: boolean | null; // null = cannot be checked / no data yet
  detail: string;
}

export async function POST(request: NextRequest) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasAnyPerm(staff.permissions, ["tracking.view", "tracking.edit"])) {
    return NextResponse.json({ error: "No tracking permission" }, { status: 403 });
  }

  let body: { product_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const productId = body.product_id ?? "";
  if (!productId) return NextResponse.json({ error: "product_id required" }, { status: 400 });

  const service = createServiceClient();
  const { data: product } = await service
    .from("products")
    .select("id, pixel_id, capi_access_token")
    .eq("id", productId)
    .single();

  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const checks: DiagnosticResult[] = [];

  // 1. Pixel ID configured
  const pixelIdOk = !!product.pixel_id && /^\d{10,20}$/.test(product.pixel_id);
  checks.push({
    key: "pixel_id",
    label: "Pixel ID configured",
    ok: pixelIdOk,
    detail: product.pixel_id
      ? pixelIdOk
        ? `Pixel ${product.pixel_id}`
        : "Pixel ID is set but doesn't look like a valid numeric ID"
      : "No Pixel ID set on this product",
  });

  // 2. CAPI token set + valid (verified against the Meta Graph API)
  if (!product.capi_access_token) {
    checks.push({
      key: "capi_token",
      label: "CAPI access token valid",
      ok: false,
      detail: "No CAPI access token set on this product",
    });
  } else if (!pixelIdOk) {
    checks.push({
      key: "capi_token",
      label: "CAPI access token valid",
      ok: null,
      detail: "Cannot verify the token without a valid Pixel ID",
    });
  } else {
    try {
      const res = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${product.pixel_id}?fields=id&access_token=${encodeURIComponent(product.capi_access_token)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        checks.push({
          key: "capi_token",
          label: "CAPI access token valid",
          ok: true,
          detail: "Meta accepted the token for this pixel",
        });
      } else {
        const err = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        checks.push({
          key: "capi_token",
          label: "CAPI access token valid",
          ok: false,
          detail: err?.error?.message ?? `Meta rejected the token (HTTP ${res.status})`,
        });
      }
    } catch {
      checks.push({
        key: "capi_token",
        label: "CAPI access token valid",
        ok: null,
        detail: "Could not reach the Meta API to verify the token",
      });
    }
  }

  // Event history for the remaining checks
  const { data: events } = await service
    .from("tracking_events")
    .select("event_name, event_id, source, status, error, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(300);

  const all = events ?? [];
  const browser = all.filter((e) => e.source === "browser");
  const server = all.filter((e) => e.source === "server");

  // 3. Pixel script loading in real browsers
  const loadedOk = browser.filter((e) => e.status !== "failed");
  const blocked = browser.filter((e) => e.status === "failed");
  checks.push({
    key: "pixel_loaded",
    label: "Pixel script loads in visitors' browsers",
    ok: browser.length === 0 ? null : loadedOk.length > 0,
    detail:
      browser.length === 0
        ? "No visits recorded yet — open the sales page (or use Test Pixel) to check"
        : loadedOk.length > 0
          ? `Loaded on recent visits${blocked.length ? ` (${blocked.length} visit(s) had it blocked by the browser)` : ""}`
          : "Recent visits report the pixel script was blocked or failed to load",
  });

  // 4. CAPI delivery
  const lastServer = server[0];
  checks.push({
    key: "capi_delivery",
    label: "CAPI events reaching Meta",
    ok: !lastServer ? null : lastServer.status === "confirmed",
    detail: !lastServer
      ? "No server events sent yet — submit a test order to check"
      : lastServer.status === "confirmed"
        ? `Last ${lastServer.event_name} event confirmed by Meta`
        : lastServer.status === "failed"
          ? `Last ${lastServer.event_name} event failed: ${lastServer.error ?? "unknown error"}`
          : `Last ${lastServer.event_name} event sent but not confirmed`,
  });

  // 5. Event IDs present (needed for deduplication)
  const browserLeads = browser.filter((e) => e.event_name === "Lead");
  const missingIds = browserLeads.filter((e) => !e.event_id);
  checks.push({
    key: "event_ids",
    label: "Event IDs attached to Lead events",
    ok: browserLeads.length === 0 ? null : missingIds.length === 0,
    detail:
      browserLeads.length === 0
        ? "No Lead events recorded yet"
        : missingIds.length === 0
          ? "All recent Lead events carry an event ID"
          : `${missingIds.length} Lead event(s) missing an event ID`,
  });

  // 6. Deduplication: browser + server Lead sharing the same event ID
  const serverLeadIds = new Set(
    server.filter((e) => e.event_name === "Lead" && e.event_id).map((e) => e.event_id)
  );
  const dedupPairs = browserLeads.filter((e) => e.event_id && serverLeadIds.has(e.event_id));
  checks.push({
    key: "dedup",
    label: "Deduplication (browser + server share event ID)",
    ok: serverLeadIds.size === 0 || browserLeads.length === 0 ? null : dedupPairs.length > 0,
    detail:
      serverLeadIds.size === 0 || browserLeads.length === 0
        ? "Needs at least one lead with both browser and server events"
        : dedupPairs.length > 0
          ? "Browser and server Lead events share the same event ID — Meta will deduplicate"
          : "Browser and server Lead events do NOT share event IDs — Meta may count leads twice",
  });

  // 7. Duplicate browser events
  const idCounts = new Map<string, number>();
  for (const e of browserLeads) {
    if (e.event_id) idCounts.set(e.event_id, (idCounts.get(e.event_id) ?? 0) + 1);
  }
  const dupes = [...idCounts.values()].filter((c) => c > 1).length;
  checks.push({
    key: "duplicates",
    label: "No duplicate Lead events",
    ok: browserLeads.length === 0 ? null : dupes === 0,
    detail:
      browserLeads.length === 0
        ? "No Lead events recorded yet"
        : dupes === 0
          ? "No duplicate Lead events detected"
          : `Duplicate Lead events detected for ${dupes} event ID(s)`,
  });

  // 8. Domain verification cannot be checked via the API
  checks.push({
    key: "domain",
    label: "Domain verified with Meta",
    ok: null,
    detail: "Check in Meta Business Suite → Brand Safety → Domains (not queryable via API)",
  });

  return NextResponse.json({ checks });
}
