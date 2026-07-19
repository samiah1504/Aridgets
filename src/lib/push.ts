import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/server";
import type { PushSubscriptionJSON } from "@/types/database";

function getWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? `mailto:${process.env.NEXT_PUBLIC_APP_EMAIL ?? "admin@example.com"}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return webpush;
}

export async function sendPushToAll(payload: {
  title: string;
  body: string;
  url?: string;
}): Promise<void> {
  const supabase = createServiceClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, subscription");

  if (!subs?.length) return;

  const message = JSON.stringify(payload);
  const staleIds: string[] = [];
  const wp = getWebPush();

  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        await wp.sendNotification(
          row.subscription as unknown as webpush.PushSubscription,
          message
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        // 410 Gone or 404 Not Found = subscription expired
        if (status === 410 || status === 404) {
          staleIds.push(row.id);
        } else {
          console.error("Push send error:", err);
        }
      }
    })
  );

  // Clean up expired subscriptions
  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }
}

export type { PushSubscriptionJSON };
