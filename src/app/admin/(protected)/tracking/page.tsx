import type { Metadata } from "next";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requirePerm } from "@/lib/auth";
import CheckPixel from "@/components/admin/CheckPixel";

export const metadata: Metadata = { title: "Pixel & CAPI" };

const MONITORED_EVENTS = ["PageView", "ViewContent", "Lead", "Contact", "Purchase"] as const;
const TEST_CHECK_EVENTS = ["PageView", "ViewContent", "Lead"] as const;

interface EventRow {
  product_id: string;
  event_name: string;
  event_id: string | null;
  source: "browser" | "server";
  status: "sent" | "confirmed" | "failed";
  error: string | null;
  test: boolean;
  created_at: string;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}

// Start of today in Lagos (UTC+1)
function lagosDayStart(): string {
  const shifted = new Date(Date.now() + 3600_000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - 3600_000).toISOString();
}

function Dot({ state, label }: { state: "ok" | "bad" | "none"; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
        state === "ok"
          ? "bg-green-50 text-green-700"
          : state === "bad"
            ? "bg-red-50 text-red-600"
            : "bg-gray-100 text-gray-500"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          state === "ok" ? "bg-green-500" : state === "bad" ? "bg-red-500" : "bg-gray-300"
        }`}
      />
      {label}
    </span>
  );
}

export default async function TrackingPage() {
  await requirePerm(["tracking.view", "tracking.edit"]);
  const supabase = await createClient();

  // Token presence comes from the service role so the secret itself never
  // enters a client-role query; only a boolean leaves this scope.
  const service = createServiceClient();
  const { data: rawProducts } = await service
    .from("products")
    .select("id, name, slug, status, pixel_id, capi_access_token")
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const products = (rawProducts ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    status: p.status,
    pixelId: p.pixel_id,
    hasCapiToken: !!p.capi_access_token,
  }));

  const dayStart = lagosDayStart();
  const [{ data: todayEvents }, { data: recentEvents }] = await Promise.all([
    supabase
      .from("tracking_events")
      .select("product_id, event_name, event_id, source, status, error, test, created_at")
      .gte("created_at", dayStart)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("tracking_events")
      .select("product_id, event_name, event_id, source, status, error, test, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const today = (todayEvents ?? []) as EventRow[];
  const recent = (recentEvents ?? []) as EventRow[];
  const hourAgo = Date.now() - 3600_000;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Pixel &amp; CAPI Testing Center</h1>
      <p className="text-sm text-gray-400 mb-6">
        Live tracking status per product. Use <strong>Test Pixel</strong> to open the sales page
        in test mode, submit a test order, then refresh this page to confirm every event arrived.
      </p>

      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          No products yet.
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const pToday = today.filter((e) => e.product_id === product.id);
            const pRecent = recent.filter((e) => e.product_id === product.id);
            const pAll = [...pToday, ...pRecent];

            const lastEvent = pAll[0] ?? null;
            const browserEvents = pAll.filter((e) => e.source === "browser");
            const serverEvents = pAll.filter((e) => e.source === "server");
            const lastServer = serverEvents[0] ?? null;
            const pixelBlockedRecently = browserEvents.slice(0, 20).some((e) => e.status === "failed");

            const pixelState: "ok" | "bad" | "none" = !product.pixelId
              ? "none"
              : browserEvents.length === 0
                ? "bad"
                : "ok";
            const capiState: "ok" | "bad" | "none" = !product.hasCapiToken
              ? "none"
              : !lastServer
                ? "none"
                : lastServer.status === "failed"
                  ? "bad"
                  : "ok";

            const testEvents = pAll.filter(
              (e) => e.test && new Date(e.created_at).getTime() >= hourAgo
            );
            const testReceived = new Set(testEvents.map((e) => e.event_name));
            const anyTest24h = pAll.some(
              (e) => e.test && Date.now() - new Date(e.created_at).getTime() < 86_400_000
            );

            // Dedup on the most recent server Lead
            const lastServerLead = serverEvents.find((e) => e.event_name === "Lead" && e.event_id);
            const matchingBrowserLead = lastServerLead
              ? browserEvents.find(
                  (e) => e.event_name === "Lead" && e.event_id === lastServerLead.event_id
                )
              : undefined;
            const browserLeadIdCounts = new Map<string, number>();
            for (const e of browserEvents) {
              if (e.event_name === "Lead" && e.event_id) {
                browserLeadIdCounts.set(e.event_id, (browserLeadIdCounts.get(e.event_id) ?? 0) + 1);
              }
            }
            const hasDuplicates = [...browserLeadIdCounts.values()].some((c) => c > 1);

            return (
              <div key={product.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                {/* Header row */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-bold text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-400 font-mono">/p/{product.slug}</p>
                  </div>
                  <a
                    href={`/p/${product.slug}?test=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-orange-600 transition"
                  >
                    🧪 Test Pixel
                  </a>
                  <CheckPixel productId={product.id} />
                </div>

                {/* Status lights */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Dot
                    state={pixelState}
                    label={
                      !product.pixelId
                        ? "No Pixel ID"
                        : pixelState === "ok"
                          ? pixelBlockedRecently
                            ? "Pixel Connected (blocked for some visitors)"
                            : "Pixel Connected"
                          : "Pixel Not Detected"
                    }
                  />
                  <Dot
                    state={capiState}
                    label={
                      !product.hasCapiToken
                        ? "No CAPI Token"
                        : capiState === "ok"
                          ? "CAPI Connected"
                          : capiState === "bad"
                            ? "CAPI Failed"
                            : "CAPI — no events yet"
                    }
                  />
                  <Dot state={anyTest24h ? "ok" : "none"} label={anyTest24h ? "Test Event Received" : "No Test Events"} />
                  <Dot
                    state={lastEvent ? "ok" : "none"}
                    label={lastEvent ? `Last Event: ${relTime(lastEvent.created_at)}` : "No Events Yet"}
                  />
                </div>

                {lastServer?.status === "failed" && lastServer.error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                    Last CAPI error: {lastServer.error}
                  </p>
                )}

                <details className="group">
                  <summary className="text-xs font-semibold text-indigo-600 cursor-pointer select-none">
                    Event monitor &amp; diagnostics ▾
                  </summary>
                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Event monitor */}
                    <div className="border border-gray-100 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        Event Monitor
                      </p>
                      <div className="space-y-2.5">
                        {MONITORED_EVENTS.map((name) => {
                          const last = pAll.find((e) => e.event_name === name);
                          const countToday = pToday.filter(
                            (e) => e.event_name === name && e.source === "browser" && !e.test
                          ).length;
                          const serverCountToday = pToday.filter(
                            (e) => e.event_name === name && e.source === "server" && !e.test
                          ).length;
                          return (
                            <div key={name} className="flex items-center justify-between text-sm">
                              <span className="font-medium text-gray-700">{name}</span>
                              <span className="text-xs text-gray-400 text-right">
                                {last ? (
                                  <>
                                    Last: {timeOnly(last.created_at)} · Today:{" "}
                                    {name === "Purchase" ? serverCountToday : countToday}
                                  </>
                                ) : (
                                  "—"
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Test checklist */}
                    <div className="border border-gray-100 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        Test Events (last hour)
                      </p>
                      {testEvents.length === 0 ? (
                        <p className="text-xs text-gray-400">
                          No test events yet. Click <strong>Test Pixel</strong>, submit a test
                          order, then refresh this page.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {TEST_CHECK_EVENTS.map((name) => (
                            <div key={name} className="flex items-center justify-between text-sm">
                              <span className="font-medium text-gray-700">{name}</span>
                              <span
                                className={
                                  testReceived.has(name)
                                    ? "text-green-600 text-xs font-semibold"
                                    : "text-red-500 text-xs font-semibold"
                                }
                              >
                                {testReceived.has(name) ? "✅ Received" : "❌ Missing"}
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700">CAPI (server Lead)</span>
                            <span
                              className={
                                testEvents.some((e) => e.source === "server" && e.event_name === "Lead")
                                  ? "text-green-600 text-xs font-semibold"
                                  : "text-red-500 text-xs font-semibold"
                              }
                            >
                              {testEvents.some((e) => e.source === "server" && e.event_name === "Lead")
                                ? "✅ Received"
                                : "❌ Missing"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dedup */}
                    <div className="border border-gray-100 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        Deduplication (last Lead)
                      </p>
                      {!lastServerLead ? (
                        <p className="text-xs text-gray-400">No Lead events yet.</p>
                      ) : (
                        <div className="space-y-2.5 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">Browser Event</span>
                            <span className="text-xs font-semibold">
                              {matchingBrowserLead ? "✓" : "❌ not seen"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">Server Event</span>
                            <span className="text-xs font-semibold">✓</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">Deduplicated</span>
                            <span
                              className={`text-xs font-semibold ${matchingBrowserLead ? "text-green-600" : "text-amber-600"}`}
                            >
                              {matchingBrowserLead ? "✓ same event ID" : "⚠ IDs don't match"}
                            </span>
                          </div>
                          {hasDuplicates && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 mt-2">
                              ⚠ Warning: duplicate Lead events detected.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
