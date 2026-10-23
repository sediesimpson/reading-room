"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { checkUrl, fetchDetails } from "@/lib/links";

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
    const { title, description, image } = await fetchDetails(url);
    const { error } = await createClient()
      .from("links")
      .insert({ url, title, description, image });
    setSaving(false);

    // 23505 is Postgres saying "this would break a unique rule".
    if (error?.code === "23505") {
      setError("that link is already in the wheel");
      return;
    }
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
