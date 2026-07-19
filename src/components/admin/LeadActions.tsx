"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LeadStatus } from "@/types";

interface Props {
  leadId: string;
  currentStatus: LeadStatus;
  callNotes: string | null;
}

type NextAction = { label: string; status: LeadStatus; style: string };

const NEXT_ACTIONS: Record<LeadStatus, NextAction[]> = {
  new: [
    { label: "Confirm Interest →", status: "buying", style: "bg-yellow-500 hover:bg-yellow-600 text-white" },
    { label: "Not Buying", status: "not_buying", style: "bg-gray-200 hover:bg-gray-300 text-gray-700" },
  ],
  buying: [
    { label: "Mark Dispatched →", status: "delivery", style: "bg-purple-600 hover:bg-purple-700 text-white" },
    { label: "Not Buying", status: "not_buying", style: "bg-gray-200 hover:bg-gray-300 text-gray-700" },
  ],
  delivery: [
    { label: "Mark Paid ✓", status: "paid", style: "bg-green-600 hover:bg-green-700 text-white" },
    { label: "Not Buying", status: "not_buying", style: "bg-gray-200 hover:bg-gray-300 text-gray-700" },
  ],
  paid: [],
  not_buying: [
    { label: "Reopen as New", status: "new", style: "bg-blue-600 hover:bg-blue-700 text-white" },
  ],
};

export default function LeadActions({ leadId, currentStatus, callNotes }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(callNotes ?? "");
  const [transitioning, setTransitioning] = useState<LeadStatus | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [error, setError] = useState("");

  async function changeStatus(newStatus: LeadStatus) {
    setTransitioning(newStatus);
    setError("");
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setTransitioning(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update status.");
    } else {
      router.refresh();
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    setError("");
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call_notes: notes }),
    });
    setSavingNotes(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save notes.");
    } else {
      router.refresh();
    }
  }

  const actions = NEXT_ACTIONS[currentStatus] ?? [];

  return (
    <div className="space-y-6">
      {actions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Actions
          </p>
          <div className="flex flex-col gap-2">
            {actions.map((a) => (
              <button
                key={a.status}
                onClick={() => changeStatus(a.status)}
                disabled={transitioning !== null}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${a.style}`}
              >
                {transitioning === a.status ? "Updating…" : a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Call notes
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Add notes about this customer…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={saveNotes}
          disabled={savingNotes}
          className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition disabled:opacity-50"
        >
          {savingNotes ? "Saving…" : "Save notes"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
