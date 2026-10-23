"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

// Returns the cleaned-up url, or null if it isn't a real web link.
function checkUrl(text: string): string | null {
  try {
    const url = new URL(text.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default function AddLinkForm({ onAdded }: { onAdded: () => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = checkUrl(text);
    if (!url) {
      setError("that doesn't look like a link. it should start with https://");
      return;
    }

    setSaving(true);
    setError(null);
    const { error } = await createClient().from("links").insert({ url });
    setSaving(false);

    if (error) {
      setError(`couldn't save it: ${error.message}`);
      return;
    }
    setText("");
    onAdded();
  }

  return (
    <section className="mt-12 border-t border-line pt-8">
      <h2 className="text-lg font-semibold">add to the wheel</h2>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="https://…"
          aria-label="link to add"
          className="min-w-0 flex-1 rounded-card border border-line px-4 py-3 outline-none focus:border-ink"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-card bg-ink px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {saving ? "adding…" : "add"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-muted">{error}</p>}
    </section>
  );
}
