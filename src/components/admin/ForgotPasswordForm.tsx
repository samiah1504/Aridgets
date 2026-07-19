"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/admin/reset-password`;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-gray-900">Check your email</p>
        <p className="text-sm text-gray-500">
          We sent a password reset link to <strong>{email}</strong>.
        </p>
        <a
          href="/admin/login"
          className="block text-sm text-indigo-600 hover:text-indigo-800 transition mt-4"
        >
          Back to login
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-center text-sm text-gray-400">
        <a href="/admin/login" className="hover:text-indigo-600 transition">
          Back to login
        </a>
      </p>
    </form>
  );
}
