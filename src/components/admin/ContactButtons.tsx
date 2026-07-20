"use client";

import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/config";
import { formatNGN } from "@/lib/utils/currency";
import { toIntlNGPhone } from "@/lib/utils/phone";

interface Props {
  leadId: string;
  phone: string;
  customerName: string;
  productName: string;
  total: number;
  actorName: string | null;
  /** compact = icon-sized buttons for list rows */
  compact?: boolean;
}

// Logged fire-and-forget so the dialler/WhatsApp opens without waiting
function logActivity(leadId: string, kind: "call_opened" | "whatsapp_opened", actorName: string | null) {
  const supabase = createClient();
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    supabase
      .from("lead_activities")
      .insert({ lead_id: leadId, user_id: user.id, actor_name: actorName, kind })
      .then(() => {});
  });
}

export function buildWhatsAppUrl(
  intlPhone: string,
  customerName: string,
  productName: string,
  total: number
): string {
  const message =
    `Hello Mr/Mrs/Miss ${customerName},\n\n` +
    `You recently placed an order for ${productName} through ${APP_NAME}.\n\n` +
    `Please confirm that you are still ready to receive the product and pay ${formatNGN(total)} on delivery.`;
  return `https://wa.me/${intlPhone.replace("+", "")}?text=${encodeURIComponent(message)}`;
}

export default function ContactButtons({
  leadId,
  phone,
  customerName,
  productName,
  total,
  actorName,
  compact = false,
}: Props) {
  const intl = toIntlNGPhone(phone);

  if (!intl) {
    return (
      <p className={compact ? "text-xs text-red-500" : "text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3"}>
        {compact ? "Invalid number" : `The stored phone number (${phone}) is not a valid Nigerian number, so calling and WhatsApp are unavailable.`}
      </p>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <a
          href={`tel:${intl}`}
          onClick={() => logActivity(leadId, "call_opened", actorName)}
          title="Call customer"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition text-sm"
        >
          📞
        </a>
        <a
          href={buildWhatsAppUrl(intl, customerName, productName, total)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => logActivity(leadId, "whatsapp_opened", actorName)}
          title="WhatsApp customer"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition text-sm"
        >
          💬
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <a
        href={`tel:${intl}`}
        onClick={() => logActivity(leadId, "call_opened", actorName)}
        className="flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition"
      >
        📞 Call Customer
      </a>
      <a
        href={buildWhatsAppUrl(intl, customerName, productName, total)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => logActivity(leadId, "whatsapp_opened", actorName)}
        className="flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-700 transition"
      >
        💬 WhatsApp
      </a>
    </div>
  );
}
