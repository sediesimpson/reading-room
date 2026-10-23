"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

// Shown the first time each of you logs in, so the app knows what to call you.
export default function NamePrompt({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = name.trim().toLowerCase();
    if (!displayName) return;

    setSaving(true);
    setError(null);
    // user_id fills itself in with whoever is logged in.
    const { error } = await createClient()
      .from("profiles")
      .insert({ display_name: displayName });
    setSaving(false);

    if (error) setError(`couldn't save your name: ${error.message}`);
    else onSaved();
  }

  return (
    <section className="mx-auto mt-16 max-w-md">
      <h1 className="text-3xl font-semibold">what should we call you?</h1>
      <p className="mt-3 text-muted">your friend will see this next to your links.</p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          required
          maxLength={30}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="your name"
          aria-label="your name"
          autoComplete="given-name"
          className="min-w-0 flex-1 rounded-card border border-line px-4 py-3 outline-none focus:border-ink"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-card bg-ink px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {saving ? "saving…" : "save"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-muted">{error}</p>}
    </section>
  );
}
