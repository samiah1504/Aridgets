"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface StaffOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Props {
  leadId: string;
  assignedTo: string | null;
  staff: StaffOption[];
}

export default function AssignLead({ leadId, assignedTo, staff }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function assign(profileId: string) {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase
      .from("leads")
      .update({ assigned_to: profileId || null })
      .eq("id", leadId);
    setSaving(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Assigned to
      </p>
      <select
        value={assignedTo ?? ""}
        disabled={saving}
        onChange={(e) => assign(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition disabled:opacity-60"
      >
        <option value="">— Unassigned —</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.full_name ?? s.email ?? s.id}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
