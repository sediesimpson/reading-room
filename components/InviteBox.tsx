"use client";

import { useState } from "react";
import type { Group } from "@/lib/types";

// The invite link for your room, with a copy button.
export default function InviteBox({ group }: { group: Group }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/join?code=${group.invite_code}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Some browsers block the clipboard; the link can still be selected by hand.
    }
  }

  return (
    <section className="mt-12 border-t border-line pt-8">
      <h2 className="text-lg font-semibold">invite someone to {group.name}</h2>
      <p className="mt-1 text-sm text-muted">anyone with this link can join your wheel.</p>
      <div className="mt-3 flex gap-2">
        <input
          readOnly
          value={link}
          aria-label="invite link"
          onFocus={(event) => event.target.select()}
          className="min-w-0 flex-1 rounded-card border border-line px-4 py-3 text-sm text-muted outline-none"
        />
        <button
          onClick={handleCopy}
          className="rounded-card border border-ink px-5 py-3 font-medium"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
    </section>
  );
}
