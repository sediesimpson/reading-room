"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import NamePrompt from "@/components/NamePrompt";

type JoinData = { profile: Profile | null; groupName: string | null };

// Your own profile, and the name of the room the invite points to.
async function fetchJoinData(code: string): Promise<JoinData> {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const [profile, groupName] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", claims?.claims.sub ?? "").maybeSingle(),
    supabase.rpc("invite_group_name", { code }),
  ]);
  if (profile.error) throw profile.error;
  if (groupName.error) throw groupName.error;
  return { profile: profile.data, groupName: groupName.data };
}

function JoinRoom() {
  const code = useSearchParams().get("code") ?? "";
  const router = useRouter();
  const [data, setData] = useState<JoinData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const loadData = useCallback(() => {
    fetchJoinData(code)
      .then(setData)
      .catch((error) => setError(error.message));
  }, [code]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleJoin() {
    setJoining(true);
    setError(null);
    const { error } = await createClient().rpc("join_group", { code });
    setJoining(false);
    if (error) setError(error.message);
    else router.push("/");
  }

  if (error && !data) return <p className="mt-16 text-center text-muted">{error}</p>;
  if (!data) return <p className="mt-16 text-center text-muted">loading…</p>;

  if (!data.groupName) {
    return (
      <p className="mt-16 text-center text-muted">
        that invite link doesn&apos;t work. ask for a new one.
      </p>
    );
  }

  // Name first, so the room knows who you are.
  if (!data.profile) return <NamePrompt onSaved={loadData} />;

  if (data.profile.group_id) {
    return (
      <section className="mx-auto mt-16 max-w-md">
        <h1 className="text-3xl font-semibold">you&apos;re already in a reading room</h1>
        <p className="mt-3 text-muted">for now, each person can be in one room.</p>
        <NextLink href="/" className="mt-6 inline-block underline">
          go to your wheel
        </NextLink>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-16 max-w-md">
      <p className="text-sm text-muted">you&apos;ve been invited to</p>
      <h1 className="mt-2 text-3xl font-semibold">{data.groupName}</h1>
      <button
        onClick={handleJoin}
        disabled={joining}
        className="mt-6 rounded-card bg-ink px-8 py-4 font-medium text-white disabled:opacity-50"
      >
        {joining ? "joining…" : "join the room"}
      </button>
      {error && <p className="mt-3 text-sm text-muted">{error}</p>}
    </section>
  );
}

export default function JoinPage() {
  return (
    // Reading ?code= from the address needs a Suspense boundary.
    <Suspense>
      <JoinRoom />
    </Suspense>
  );
}
