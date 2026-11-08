"use client";

import { useState } from "react";

// Copies an order's text summary (built on the server) to the clipboard.

interface Props {
  text: string;
  /** compact = small button for list rows */
  compact?: boolean;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / non-secure contexts
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.className = "fixed -left-[9999px] top-0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export default function CopyOrderButton({ text, compact }: Props) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setState((await copyText(text)) ? "copied" : "failed");
    setTimeout(() => setState("idle"), 2000);
  }

  const label = state === "copied" ? "Copied ✓" : state === "failed" ? "Copy failed" : compact ? "Copy" : "📋 Copy order";

  return (
    <button
      type="button"
      onClick={onClick}
      title="Copy order details"
      aria-label={compact && state === "idle" ? "Copy order details" : undefined}
      aria-live="polite"
      className={
        compact
          ? `text-xs font-medium px-2 py-1.5 rounded-lg border transition whitespace-nowrap ${
              state === "copied" ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`
          : `text-sm font-medium px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${
              state === "copied" ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`
      }
    >
      {label}
    </button>
  );
}
