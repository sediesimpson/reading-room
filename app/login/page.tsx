"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

// Turns Supabase's error into something friendlier.
function explain(error: { code?: string; message: string }) {
  if (error.code === "otp_disabled" || /signups not allowed/i.test(error.message)) {
    return "that email isn't on the list. only the two of you can log in.";
  }
  if (error.code === "over_email_send_rate_limit") {
    return "too many emails just now. wait a few minutes and try again.";
  }
  return `couldn't send the link: ${error.message}`;
}

function LoginForm() {
  const linkFailed = useSearchParams().get("error") === "link";
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
        // Never make a new account here: only the two existing users get in.
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setSending(false);
    if (error) setError(explain(error));
    else setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <div className="mt-3">
        <p className="text-muted">
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
      <p className="mt-3 text-muted">we&apos;ll email you a link. no password needed.</p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
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
    <section className="mx-auto mt-16 max-w-md">
      <h1 className="text-3xl font-semibold">log in</h1>
      {/* Reading ?error= from the address needs a Suspense boundary. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </section>
  );
}
