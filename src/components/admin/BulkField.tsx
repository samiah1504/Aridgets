"use client";

import { useId } from "react";
import type { LineError } from "@/lib/utils/bulkContent";

// One-item-per-line textarea with a live item count and per-line errors.
// Kept free of parsing logic: the caller passes the parsed count and errors.

interface Props {
  label: string;
  hint: string;
  example: string;
  value: string;
  onChange: (v: string) => void;
  count: number;
  noun: [singular: string, plural: string];
  errors?: LineError[];
  rows?: number;
}

export default function BulkField({
  label,
  hint,
  example,
  value,
  onChange,
  count,
  noun,
  errors = [],
  rows = 6,
}: Props) {
  const id = useId();
  const hasErrors = errors.length > 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <span
          className={`text-xs font-medium shrink-0 ${
            hasErrors ? "text-red-500" : count > 0 ? "text-green-600" : "text-gray-400"
          }`}
        >
          {count} {count === 1 ? noun[0] : noun[1]} detected
          {hasErrors && ` · ${errors.length} to fix`}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-2">{hint}</p>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={example}
        spellCheck
        className={`w-full border rounded-lg px-3 py-2 text-base sm:text-sm leading-relaxed outline-none focus:ring-2 transition resize-y ${
          hasErrors
            ? "border-red-300 focus:ring-red-500/20 focus:border-red-400"
            : "border-gray-200 focus:ring-indigo-500/30 focus:border-indigo-500"
        }`}
      />
      {hasErrors && (
        <ul className="mt-2 space-y-1 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
          {errors.map((e) => (
            <li key={e.line} className="text-xs text-red-600">
              <span className="font-semibold">Line {e.line}:</span> {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
