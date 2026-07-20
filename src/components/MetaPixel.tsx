"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

interface MetaPixelProps {
  pixelId: string;
  productId: string;
  productName: string;
  price: number;
}

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown };
  }
}

export function getTrackingSession(): { sessionId: string; test: boolean } {
  let sessionId = "";
  let test = false;
  try {
    sessionId = sessionStorage.getItem("ar_sid") ?? "";
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("ar_sid", sessionId);
    }
    if (new URLSearchParams(window.location.search).get("test") === "1") {
      sessionStorage.setItem("ar_test", "1");
    }
    test = sessionStorage.getItem("ar_test") === "1";
  } catch {
    sessionId = sessionId || crypto.randomUUID();
  }
  return { sessionId, test };
}

export function beacon(payload: Record<string, unknown>): void {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // tracking must never break the page
  }
}

export default function MetaPixel({ pixelId, productId, productName, price }: MetaPixelProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const { sessionId, test } = getTrackingSession();

    const pageViewId = crypto.randomUUID();
    const viewContentId = crypto.randomUUID();
    const timers: ReturnType<typeof setTimeout>[] = [];

    function report(loaded: boolean) {
      for (const [name, id] of [
        ["PageView", pageViewId],
        ["ViewContent", viewContentId],
      ] as const) {
        beacon({
          product_id: productId,
          event_name: name,
          event_id: id,
          session_id: sessionId,
          test,
          pixel_loaded: loaded,
        });
      }
    }

    // The fbq stub is created by our inline snippet (afterInteractive), which
    // may run after hydration — retry briefly until it exists.
    let tries = 0;
    function fire() {
      if (typeof window.fbq === "function") {
        window.fbq("track", "PageView", {}, { eventID: pageViewId });
        window.fbq(
          "track",
          "ViewContent",
          { content_name: productName, content_type: "product", currency: "NGN", value: price },
          { eventID: viewContentId }
        );
        // After a grace period, verify the real script loaded. The stub exists
        // immediately; callMethod is only set once fbevents.js loads — so its
        // absence means the pixel was blocked in this browser.
        timers.push(
          setTimeout(() => {
            report(typeof window.fbq === "function" && !!window.fbq.callMethod);
          }, 2500)
        );
      } else if (++tries < 40) {
        timers.push(setTimeout(fire, 250));
      } else {
        report(false);
      }
    }
    fire();

    return () => timers.forEach(clearTimeout);
  }, [pixelId, productId, productName, price]);

  // Pixel IDs are purely numeric — reject anything else to prevent script injection
  if (!/^\d{10,20}$/.test(pixelId)) return null;

  return (
    <>
      <Script id={`fb-pixel-${pixelId}`} strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
        (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','${pixelId}');
      `}</Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
