"use client";

import Link from "next/link";
import { useState } from "react";
import { formatNGN } from "@/lib/utils/currency";

export interface ProductRow {
  id: string;
  name: string;
  slug: string | null;
  orders: number;
  confirmed: number;
  delivered: number;
  paid: number;
  cancelled: number;
  orderValue: number;
  collected: number;
  avgPaid: number | null;
  confirmationRate: number | null;
  paidRate: number | null;
}

type Key = keyof Omit<ProductRow, "id" | "slug">;

const COLUMNS: { key: Key; label: string; money?: boolean; pct?: boolean }[] = [
  { key: "orders", label: "Orders" },
  { key: "confirmed", label: "Confirmed" },
  { key: "delivered", label: "Delivered" },
  { key: "paid", label: "Paid" },
  { key: "cancelled", label: "Cancelled" },
  { key: "orderValue", label: "Order value", money: true },
  { key: "collected", label: "Collected", money: true },
  { key: "avgPaid", label: "Avg paid order", money: true },
  { key: "confirmationRate", label: "Conf. rate", pct: true },
  { key: "paidRate", label: "Paid rate", pct: true },
];

const fmt = (v: number | null, c: { money?: boolean; pct?: boolean }) =>
  v == null ? "—" : c.money ? formatNGN(v) : c.pct ? `${(v * 100).toFixed(1)}%` : String(v);

export default function ProductPerformanceTable({ rows }: { rows: ProductRow[] }) {
  const [sortKey, setSortKey] = useState<Key>("collected");
  const [desc, setDesc] = useState(true);

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? -1, bv = b[sortKey] ?? -1;
    const cmp = typeof av === "string" ? String(av).localeCompare(String(bv)) : (av as number) - (bv as number);
    return desc ? -cmp : cmp;
  });

  function sortBy(k: Key) {
    if (k === sortKey) setDesc(!desc);
    else { setSortKey(k); setDesc(k !== "name"); }
  }

  if (!rows.length) return <p className="px-5 py-10 text-sm text-gray-400 text-center">No orders in this period.</p>;

  return (
    <>
      {/* Phone: sort picker + cards */}
      <div className="md:hidden px-4 py-3 space-y-3">
        <label className="flex items-center gap-2 text-xs text-gray-500">
          Sort by
          <select
            value={sortKey}
            onChange={(e) => sortBy(e.target.value as Key)}
            className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white"
          >
            <option value="name">Product name</option>
            {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>
        {sorted.map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-100 p-3">
            <p className="font-semibold text-gray-900">{r.name}</p>
            {r.slug && <Link href={`/p/${r.slug}`} target="_blank" className="text-xs text-indigo-600">/p/{r.slug} ↗</Link>}
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {COLUMNS.map((c) => (
                <div key={c.key} className="flex justify-between gap-2">
                  <dt className="text-gray-400">{c.label}</dt>
                  <dd className="font-medium text-gray-900 text-right">{fmt(r[c.key] as number | null, c)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Desktop: sortable table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-4 py-3">
                <button type="button" onClick={() => sortBy("name")} className="uppercase hover:text-gray-700">
                  Product {sortKey === "name" && (desc ? "↓" : "↑")}
                </button>
              </th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="px-3 py-3 text-right whitespace-nowrap" aria-sort={sortKey === c.key ? (desc ? "descending" : "ascending") : "none"}>
                  <button type="button" onClick={() => sortBy(c.key)} className="uppercase hover:text-gray-700">
                    {c.label} {sortKey === c.key && (desc ? "↓" : "↑")}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{r.name}</p>
                  {r.slug && <Link href={`/p/${r.slug}`} target="_blank" className="text-xs text-indigo-600">/p/{r.slug} ↗</Link>}
                </td>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="px-3 py-3 text-right whitespace-nowrap text-gray-700">{fmt(r[c.key] as number | null, c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
