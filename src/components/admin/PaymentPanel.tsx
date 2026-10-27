"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatNGN } from "@/lib/utils/currency";
import { PURCHASE_EVENT_LABELS } from "@/lib/leadStatus";
import type { LeadStatus } from "@/types";
import type { PurchaseEventStatus } from "@/types/database";

// Payment summary, "record payment / mark Paid" form, payment history and the
// Meta Purchase event delivery state for one order.

interface Payment {
  id: string;
  amount: number;
  note: string | null;
  created_at: string;
  recorded_by_name: string | null;
}

interface Props {
  leadId: string;
  status: LeadStatus;
  total: number;
  amountPaid: number;
  paidAt: string | null;
  paidByName: string | null;
  payments: Payment[];
  purchaseEvent: {
    status: PurchaseEventStatus | null;
    value: number | null;
    attempts: number;
    error: string | null;
    sentAt: string | null;
    trigger: string | null;
  };
  canMarkPaid: boolean;
}

const fmtTime = (iso: string) =>
  // Fixed time zone so the server render and the browser agree
  new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

function newKey() {
  return crypto.randomUUID();
}

export default function PaymentPanel({
  leadId,
  status,
  total,
  amountPaid,
  paidAt,
  paidByName,
  payments,
  purchaseEvent,
  canMarkPaid,
}: Props) {
  const router = useRouter();
  const outstanding = Math.max(total - amountPaid, 0);
  const [amountText, setAmountText] = useState(outstanding ? String(outstanding) : "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"pay" | "retry" | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error" | "warn"; text: string } | null>(null);
  // One key per intended payment: repeated clicks or retries of the same
  // submission reuse it, so the server records the payment only once.
  const key = useRef(newKey());

  const amount = Number(amountText);
  const amountValid = Number.isInteger(amount) && amount > 0 && amount <= outstanding;
  const completes = amountValid && amount === outstanding;
  const blocked = status === "cancelled" || status === "not_buying";

  async function recordPayment() {
    if (!amountValid || busy) return;
    setBusy("pay");
    setMessage(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, note: note.trim() || undefined, idempotency_key: key.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ kind: "error", text: data.error ?? "Payment was not recorded." });
        if (res.status === 400) key.current = newKey(); // rejected: a corrected entry is a new request
        return;
      }
      key.current = newKey();
      setNote("");
      const p = data.purchase as { status: string; error?: string; test?: boolean } | null;
      if (data.became_paid || (data.duplicate && data.status === "paid")) {
        setMessage(
          p?.status === "sent"
            ? { kind: "ok", text: `Order marked Paid. Purchase of ${formatNGN(data.amount_paid)} sent to Meta${p.test ? " (test events)" : ""}.` }
            : p?.status === "failed"
              ? { kind: "warn", text: `Order marked Paid, but the Purchase event failed: ${p.error}. You can retry below.` }
              : { kind: "ok", text: "Order marked Paid." }
        );
      } else {
        setMessage({ kind: "ok", text: `Payment recorded. Outstanding balance: ${formatNGN(data.outstanding)}.` });
      }
      setAmountText(data.outstanding ? String(data.outstanding) : "");
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Could not reach the server. Your payment was not confirmed — try again (it will not be recorded twice)." });
    } finally {
      setBusy(null);
    }
  }

  async function retryPurchase() {
    if (busy) return;
    setBusy("retry");
    setMessage(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/purchase-event`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.status === "sent") setMessage({ kind: "ok", text: "Purchase sent to Meta." });
      else if (data.status === "skipped") setMessage({ kind: "warn", text: data.reason });
      else setMessage({ kind: "error", text: data.error ?? "Purchase event failed again." });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Could not reach the server." });
    } finally {
      setBusy(null);
    }
  }

  const ev = purchaseEvent.status ? PURCHASE_EVENT_LABELS[purchaseEvent.status] : null;

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Payment</p>

      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Order total", formatNGN(total), "text-gray-900"],
          ["Collected", formatNGN(amountPaid), amountPaid > 0 ? "text-emerald-700" : "text-gray-900"],
          ["Outstanding", formatNGN(outstanding), outstanding > 0 ? "text-amber-700" : "text-gray-900"],
        ].map(([label, value, cls]) => (
          <div key={label} className="rounded-lg bg-gray-50 px-2 py-2">
            <dt className="text-[11px] text-gray-400">{label}</dt>
            <dd className={`text-sm font-bold ${cls}`}>{value}</dd>
          </div>
        ))}
      </dl>

      {status === "paid" && paidAt && (
        <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          ✓ Paid in full · {fmtTime(paidAt)}{paidByName ? ` · by ${paidByName}` : ""}
        </p>
      )}

      {canMarkPaid && outstanding > 0 && !blocked && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700" htmlFor="pay-amount">
            Amount collected (₦)
          </label>
          <input
            id="pay-amount"
            type="number"
            inputMode="numeric"
            min={1}
            max={outstanding}
            value={amountText}
            onChange={(e) => { setAmountText(e.target.value); key.current = newKey(); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
          {amountText && !amountValid && (
            <p className="text-xs text-red-500">Enter a whole amount from ₦1 to {formatNGN(outstanding)}.</p>
          )}
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional) — e.g. cash to rider, transfer ref"
            maxLength={500}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={recordPayment}
            disabled={!amountValid || busy !== null}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
          >
            {busy === "pay"
              ? "Recording…"
              : completes
                ? `Record ${formatNGN(amount)} & mark Paid`
                : amountValid
                  ? `Record partial payment of ${formatNGN(amount)}`
                  : "Record payment"}
          </button>
          <p className="text-[11px] text-gray-400">
            The order becomes Paid — and the Purchase event is sent to Meta — only when the full total is collected.
          </p>
        </div>
      )}
      {canMarkPaid && outstanding > 0 && blocked && (
        <p className="text-xs text-gray-500">Reopen this order before recording a payment.</p>
      )}

      {payments.length > 0 && (
        <ul className="space-y-1.5">
          {payments.map((p) => (
            <li key={p.id} className="flex justify-between gap-3 text-xs border-b border-gray-50 pb-1.5">
              <span className="text-gray-500">
                {fmtTime(p.created_at)}{p.recorded_by_name ? ` · ${p.recorded_by_name}` : ""}
                {p.note && <span className="block text-gray-400">{p.note}</span>}
              </span>
              <span className="font-semibold text-gray-900 shrink-0">{formatNGN(p.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      {ev && (
        <div className="rounded-lg border border-gray-100 px-3 py-2.5 space-y-1">
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${ev.badge}`}>{ev.label}</span>
          {purchaseEvent.value != null && (
            <p className="text-xs text-gray-500">
              Value {formatNGN(purchaseEvent.value)} NGN
              {purchaseEvent.trigger === "confirmed_legacy" && " · sent when the order was confirmed (before payment tracking)"}
            </p>
          )}
          {purchaseEvent.sentAt && <p className="text-xs text-gray-400">Accepted by Meta {fmtTime(purchaseEvent.sentAt)}</p>}
          {purchaseEvent.attempts > 0 && <p className="text-xs text-gray-400">Attempts: {purchaseEvent.attempts}</p>}
          {purchaseEvent.status !== "sent" && purchaseEvent.error && (
            <p className="text-xs text-red-600 break-words">{purchaseEvent.error}</p>
          )}
          {canMarkPaid && (purchaseEvent.status === "failed" || purchaseEvent.status === "pending") && (
            <button
              type="button"
              onClick={retryPurchase}
              disabled={busy !== null}
              className="mt-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              {busy === "retry" ? "Sending…" : "Retry sending Purchase"}
            </button>
          )}
        </div>
      )}

      {message && (
        <p
          role="status"
          className={`text-sm rounded-lg px-3 py-2 ${
            message.kind === "ok" ? "bg-green-50 text-green-800" : message.kind === "warn" ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
