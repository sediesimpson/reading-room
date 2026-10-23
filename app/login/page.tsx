"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Wheel, { type Slice } from "@/components/Wheel";

// A made-up wheel for decoration: pale blue for you, green for friends.
const DEMO_SLICES: Slice[] = ["a", "f", "a", "a", "f", "a", "f", "f", "a", "f"].map(
  (who, index) => ({
    id: index,
    color: who === "a" ? "var(--color-accent)" : "var(--color-friend)",
  })
);

const STEPS = [
  ["add links", "anything you've been meaning to read goes on the wheel."],
  ["spin once a day", "whoever opens the app first spins. the pick is the same for everyone."],
  ["read and talk", "mark it as read and see who else has."],
];

// Turns Supabase's error into something friendlier.
function explain(error: { code?: string; message: string }) {
  if (error.code === "over_email_send_rate_limit") {
    return "too many emails just now. wait a few minutes and try again.";
  }
  return `couldn't send the link: ${error.message}`;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const linkFailed = searchParams.get("error") === "link";
  // Set when you were on your way somewhere, like an invite link.
  const next = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    linkFailed ? "that link didn't work. it may have expired, so ask for a new one." : null
  );
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: {
        // A new email gets an account the first time it logs in.
        shouldCreateUser: true,
        emailRedirectTo:
          `${window.location.origin}/auth/callback` +
          (next ? `?next=${encodeURIComponent(next)}` : ""),
      },
    });
    setSending(false);
    if (error) setError(explain(error));
    else setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <div>
        <h2 className="text-xl font-semibold">check your email</h2>
        <p className="mt-2 text-muted">
          we sent a link to <span className="text-ink">{sentTo}</span>. open it in this browser to
          log in.
        </p>
        <button onClick={() => setSentTo(null)} className="mt-4 text-sm text-muted underline">
          use a different email
        </button>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold">log in or sign up</h2>
      <p className="mt-2 text-muted">we&apos;ll email you a link. no password needed.</p>
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          aria-label="your email"
          autoComplete="email"
          className="min-w-0 flex-1 rounded-card border border-line px-4 py-3 outline-none focus:border-ink"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-card bg-ink px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {sending ? "sending…" : "send me a link"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-muted">{error}</p>}
    </>
  );
}

export default function LoginPage() {
  return (
    <>
      <section className="mt-12 text-center">
        <div className="mx-auto w-[180px]">
          <Wheel slices={DEMO_SLICES} size={180} rotation={-14} />
        </div>
        <h1 className="mt-8 text-3xl font-semibold sm:text-4xl">one article a day, read together</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          a shared wheel of links for you and your friends. each day it picks one for all of you
          to read.
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-lg rounded-card border border-line p-6 sm:p-8">
        {/* Reading ?error= from the address needs a Suspense boundary. */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </section>

      <ol className="mx-auto mt-10 grid max-w-lg gap-5 sm:grid-cols-3">
        {STEPS.map(([title, text], index) => (
          <li key={title}>
            <span className="flex size-7 items-center justify-center rounded-full bg-accent text-sm font-semibold">
              {index + 1}
            </span>
            <p className="mt-2 font-medium">{title}</p>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
