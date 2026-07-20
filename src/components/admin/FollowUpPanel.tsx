"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  leadId: string;
  followUpAt: string | null;
  lastContactedAt: string | null;
  actorName: string | null;
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function FollowUpPanel({ leadId, followUpAt, lastContactedAt, actorName }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(toLocalInputValue(followUpAt));
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState("");

  async function saveFollowUp() {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase
      .from("leads")
      .update({ follow_up_at: value ? new Date(value).toISOString() : null })
      .eq("id", leadId);
    setSaving(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  async function markContacted() {
    setMarking(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from("leads")
      .update({ last_contacted_at: new Date().toISOString() })
      .eq("id", leadId);
    if (!err && user) {
      await supabase.from("lead_activities").insert({
        lead_id: leadId,
        user_id: user.id,
        actor_name: actorName,
        kind: "contacted",
      });
    }
    setMarking(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Follow-up
        </p>
        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          />
          <button
            onClick={saveFollowUp}
            disabled={saving}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition disabled:opacity-50 shrink-0"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-400">
          Last contacted:{" "}
          <span className="font-medium text-gray-600">
            {lastContactedAt
              ? new Date(lastContactedAt).toLocaleString("en-NG", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "never"}
          </span>
        </p>
        <button
          onClick={markContacted}
          disabled={marking}
          className="mt-2 w-full border border-gray-200 text-gray-600 text-xs font-semibold py-2 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
        >
          {marking ? "Saving…" : "Mark contacted now"}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
