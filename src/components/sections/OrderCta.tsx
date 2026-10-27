"use client";

import { formatNGN } from "@/lib/utils/currency";
import type { PurchaseOption } from "@/types";

// In-page order block for the Product Options & Bundles template. Tapping an
// option pre-selects it in the order form and scrolls there; plain #order
// links keep working if JavaScript hasn't loaded yet.

export const CHOOSE_OPTION_EVENT = "aridgets:choose-option";

interface Props {
  heading: string;
  sub?: string;
  options: PurchaseOption[];
  ctaText?: string;
  trustRow?: string[];
  /** compact = button only (used lower on the page) */
  variant?: "options" | "compact";
  fromPrice: number;
  pricesVary: boolean;
}

function goToOrder(optionId?: string) {
  if (optionId) window.dispatchEvent(new CustomEvent(CHOOSE_OPTION_EVENT, { detail: { optionId } }));
  document.getElementById("order")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function OrderCta({ heading, sub, options, ctaText, trustRow, variant = "options", fromPrice, pricesVary }: Props) {
  if (!options.length) return null;
  const label = ctaText || "Order Now — Pay on Delivery";

  return (
    <section className="px-4 sp-section" aria-label="Order">
      <div className="max-w-lg mx-auto sp-card p-5">
        <h2 className="text-xl font-extrabold text-center">{heading}</h2>
        {sub && <p className="text-sm sp-muted text-center mt-1">{sub}</p>}

        {variant === "options" ? (
          <ul className="mt-4 space-y-2">
            {options.map((o) => (
              <li key={o.id}>
                <a
                  href="#order"
                  onClick={(e) => { e.preventDefault(); goToOrder(o.id); }}
                  className="sp-choice flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold leading-snug">{o.name}</span>
                    {o.description && <span className="block text-xs sp-muted mt-0.5 truncate">{o.description}</span>}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-extrabold sp-primary-text">{formatNGN(o.price)}</span>
                    <span className="block text-xs font-semibold sp-muted">Choose ›</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-center">
            {pricesVary && <span className="text-sm font-semibold sp-muted mr-1">From</span>}
            <span className="text-2xl font-extrabold sp-primary-text">{formatNGN(fromPrice)}</span>
          </p>
        )}

        <a
          href="#order"
          onClick={(e) => { e.preventDefault(); goToOrder(); }}
          className="sp-btn mt-4 block w-full text-center text-lg font-bold py-4 shadow-md"
        >
          {label}
        </a>
        {trustRow && trustRow.length > 0 && (
          <p className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs sp-muted">
            {trustRow.slice(0, 3).map((t, i) => (
              <span key={i}><span className="sp-primary-text font-bold">✓</span> {t}</span>
            ))}
          </p>
        )}
      </div>
    </section>
  );
}
