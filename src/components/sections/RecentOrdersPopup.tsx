"use client";

import { useEffect, useRef, useState } from "react";

interface OrderItem {
  first_name: string;
  place: string;
  product: string;
  at: string;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

// Rotating "recent orders" social-proof toast (bottom-left).
// Shows only real, sanitized orders served by /api/social-proof.
export default function RecentOrdersPopup({ productId }: { productId: string }) {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let cancelled = false;

    try {
      if (sessionStorage.getItem("ar_sp_off") === "1") return;
    } catch {
      // ignore storage errors
    }

    fetch(`/api/social-proof?product_id=${encodeURIComponent(productId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { orders?: OrderItem[] } | null) => {
        if (cancelled || !data?.orders?.length) return;
        setOrders(data.orders);
        setDismissed(false);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
    };
  }, [productId]);

  // Rotation: show for ~7s, hide, wait 20–40s, show the next one
  useEffect(() => {
    if (dismissed || orders.length === 0) return;

    const showDelay = visible ? 0 : index === 0 ? 4000 : 20000 + Math.random() * 20000;

    if (!visible) {
      const t = setTimeout(() => setVisible(true), showDelay);
      timers.current.push(t);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      setVisible(false);
      setIndex((i) => (i + 1) % orders.length);
    }, 7000);
    timers.current.push(t);
    return () => clearTimeout(t);
  }, [visible, dismissed, orders.length, index]);

  if (dismissed || orders.length === 0) return null;
  const order = orders[index];

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem("ar_sp_off", "1");
    } catch {
      // ignore storage errors
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 left-4 z-40 max-w-[280px] transition-all duration-500 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl shadow-black/20 border border-gray-100 px-4 py-3 pr-8">
        <button
          onClick={dismiss}
          aria-label="Dismiss notifications"
          className="absolute top-1.5 right-2 text-gray-300 hover:text-gray-500 text-lg leading-none"
        >
          ×
        </button>
        <div className="flex items-start gap-2.5">
          <span className="text-xl mt-0.5" aria-hidden>
            🛍️
          </span>
          <div className="min-w-0">
            <p className="text-sm text-gray-800 leading-snug">
              <span className="font-bold">{order.first_name}</span> from{" "}
              <span className="font-semibold">{order.place}</span> ordered{" "}
              <span className="font-semibold">{order.product}</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{relTime(order.at)} ✓ verified order</p>
          </div>
        </div>
      </div>
    </div>
  );
}
