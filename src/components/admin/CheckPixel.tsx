"use client";

import { useState } from "react";

interface DiagnosticResult {
  key: string;
  label: string;
  ok: boolean | null;
  detail: string;
}

export default function CheckPixel({ productId }: { productId: string }) {
  const [running, setRunning] = useState(false);
  const [checks, setChecks] = useState<DiagnosticResult[] | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/tracking/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Diagnostics failed.");
        return;
      }
      setChecks(data.checks as DiagnosticResult[]);
    } catch {
      setError("Network error running diagnostics.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={running}
        className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition disabled:opacity-60"
      >
        {running ? "Checking…" : "Check Pixel"}
      </button>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {checks && (
        <ul className="mt-3 space-y-1.5">
          {checks.map((c) => (
            <li key={c.key} className="flex items-start gap-2 text-sm">
              <span className="shrink-0 mt-0.5">
                {c.ok === true ? "✅" : c.ok === false ? "❌" : "⚪"}
              </span>
              <div>
                <span className="font-medium text-gray-800">{c.label}</span>
                <p className="text-xs text-gray-400">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
