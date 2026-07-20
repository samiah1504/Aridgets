"use client";

import { useEffect, useState } from "react";

type SubscriptionState = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading";


export default function PushSubscribe() {
  const [state, setState] = useState<SubscriptionState>("loading");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setState(sub ? "subscribed" : "unsubscribed");
      } catch {
        if (!cancelled) setState("unsubscribed");
      }
    }
    queueMicrotask(detect);
    return () => {
      cancelled = true;
    };
  }, []);

  async function subscribe() {
    setWorking(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("VAPID key not configured");

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setState("subscribed");
    } catch (err) {
      console.error("Push subscribe error:", err);
    } finally {
      setWorking(false);
    }
  }

  async function unsubscribe() {
    setWorking(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      await sub?.unsubscribe();
      await fetch("/api/push/unsubscribe", { method: "POST" });
      setState("unsubscribed");
    } catch (err) {
      console.error("Push unsubscribe error:", err);
    } finally {
      setWorking(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  if (state === "denied") {
    return (
      <span className="text-xs text-gray-400 hidden sm:block">
        Notifications blocked
      </span>
    );
  }

  if (state === "subscribed") {
    return (
      <button
        onClick={unsubscribe}
        disabled={working}
        className="text-xs text-green-400 hover:text-gray-400 transition hidden sm:block disabled:opacity-50"
        title="Push notifications on — click to disable"
      >
        {working ? "…" : "🔔 On"}
      </button>
    );
  }

  return (
    <button
      onClick={subscribe}
      disabled={working}
      className="text-xs text-gray-400 hover:text-white transition hidden sm:block disabled:opacity-50"
      title="Enable push notifications for new leads"
    >
      {working ? "…" : "🔔 Enable alerts"}
    </button>
  );
}
