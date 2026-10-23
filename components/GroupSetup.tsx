"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { ROOM_CHANGED } from "@/components/RoomName";

// Shown when you're logged in but not in a reading room yet.
export default function GroupSetup({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const groupName = name.trim().toLowerCase();
    if (!groupName) return;

    setSaving(true);
    setError(null);
    const { error } = await createClient().rpc("create_group", { group_name: groupName });
    setSaving(false);

    if (error) setError(error.message);
    else {
      window.dispatchEvent(new Event(ROOM_CHANGED));
      onCreated();
    }
  }

  return (
    <section className="mx-auto mt-16 max-w-md">
      <h1 className="text-3xl font-semibold">start a reading room</h1>
      <p className="mt-3 text-muted">
        a room is one shared wheel. once it&apos;s made, you&apos;ll get a link to invite people.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          required
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. sunday papers"
          aria-label="room name"
          className="min-w-0 flex-1 rounded-card border border-line px-4 py-3 outline-none focus:border-ink"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-card bg-ink px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {saving ? "creating…" : "create"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-muted">{error}</p>}
      <p className="mt-8 text-sm text-muted">
        joining a friend instead? open the invite link they sent you.
      </p>
    </section>
  );
}
