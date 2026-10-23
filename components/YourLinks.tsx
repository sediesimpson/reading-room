"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { checkUrl, fetchDetails, publicationOf } from "@/lib/links";
import type { Link } from "@/lib/types";

// Shown when the database refuses a change (it checks the same rules again).
const LOCKED = "this link has been picked, so it can't be changed";

function LinkRow({
  link,
  picked,
  onChanged,
}: {
  link: Link;
  picked: boolean;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [text, setText] = useState(link.url);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = checkUrl(text);
    if (!url) {
      setError("that doesn't look like a link. it should start with https://");
      return;
    }

    setBusy(true);
    setError(null);
    // A new url means a new article, so fetch its title again.
    const details = await fetchDetails(url);
    const { data, error } = await createClient()
      .from("links")
      .update({ url, ...details })
      .eq("id", link.id)
      .select("id");
    setBusy(false);

    if (error?.code === "23505") return setError("that link is already in the wheel");
    if (error) return setError(`couldn't save it: ${error.message}`);
    // The rules quietly skip rows you're not allowed to change.
    if (data.length === 0) return setError(LOCKED);
    setMode("view");
    onChanged();
  }

  async function handleDelete() {
    setBusy(true);
    setError(null);
    const { data, error } = await createClient()
      .from("links")
      .delete()
      .eq("id", link.id)
      .select("id");
    setBusy(false);

    if (error) return setError(`couldn't delete it: ${error.message}`);
    if (data.length === 0) return setError(LOCKED);
    onChanged();
  }

  if (mode === "edit") {
    return (
      <li className="py-4">
        <form onSubmit={handleSave} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            inputMode="url"
            autoComplete="off"
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-label="new link"
            autoFocus
            className="min-w-0 flex-1 rounded-card border border-line px-4 py-2 outline-none focus:border-ink"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-card bg-ink px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {busy ? "saving…" : "save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("view");
                setText(link.url);
                setError(null);
              }}
              className="rounded-card border border-line px-4 py-2"
            >
              cancel
            </button>
          </div>
        </form>
        {error && <p className="mt-2 text-sm text-muted">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="truncate font-medium">{link.title ?? link.url}</p>
        <p className="truncate text-sm text-muted">{publicationOf(link.url)}</p>
        {error && <p className="mt-1 text-sm text-muted">{error}</p>}
      </div>
      <div className="flex shrink-0 gap-3 text-sm">
        {picked ? (
          <span className="text-muted">picked</span>
        ) : mode === "delete" ? (
          <>
            <span className="text-muted">delete?</span>
            <button onClick={handleDelete} disabled={busy} className="font-medium underline">
              {busy ? "deleting…" : "yes"}
            </button>
            <button onClick={() => setMode("view")} className="text-muted underline">
              no
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setMode("edit")} className="text-muted underline hover:text-ink">
              edit
            </button>
            <button onClick={() => setMode("delete")} className="text-muted underline hover:text-ink">
              delete
            </button>
          </>
        )}
      </div>
    </li>
  );
}

// Your own links that are still on the wheel. Nobody else's ever appear here.
export default function YourLinks({
  links,
  pickedIds,
  onChanged,
}: {
  links: Link[];
  pickedIds: Set<number>;
  onChanged: () => void;
}) {
  if (links.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">your links</h2>
      <ul className="mt-2 divide-y divide-line border-y border-line">
        {links.map((link) => (
          <LinkRow
            key={link.id}
            link={link}
            picked={pickedIds.has(link.id)}
            onChanged={onChanged}
          />
        ))}
      </ul>
    </section>
  );
}
