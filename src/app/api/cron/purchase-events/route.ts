import { NextRequest, NextResponse } from "next/server";
import { retryPendingPurchaseEvents } from "@/lib/purchaseEvent";

// Scheduled safety net (vercel.json cron): retries pending/failed Purchase
// events. Vercel sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET
// is set in the project; without it this endpoint stays closed.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await retryPendingPurchaseEvents());
}
