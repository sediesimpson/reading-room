"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { createClient } from "@/lib/supabase";
import { pickDateLabel, todayIso } from "@/lib/dates";
import { publicationOf } from "@/lib/links";
import { listNames } from "@/lib/names";
import type { DailyPick, Link, Profile, Read } from "@/lib/types";

// A pick with its link attached. Picked links can always be read in full.
type PastPick = DailyPick & { links: Link | null };

type PastData = {
  picks: PastPick[];
  reads: Read[];
  members: Profile[];
  inRoom: boolean;
  today: string;
  me: string;
};

// Every earlier pick in your room, newest first, plus who read what.
async function fetchPastData(): Promise<PastData> {
  const supabase = createClient();
  const today = todayIso();
  const [claims, picks, reads, profiles] = await Promise.all([
    supabase.auth.getClaims(),
    supabase
      .from("daily_picks")
      .select("*, links(*)")
      .lt("pick_date", today)
      .order("pick_date", { ascending: false }),
    supabase.from("reads").select("*"),
    supabase.from("profiles").select("*"),
  ]);
  for (const result of [picks, reads, profiles]) {
    if (result.error) throw result.error;
  }
  const me = claims.data?.claims.sub;
  if (!me) throw new Error("you're not logged in");

  const myProfile = profiles.data!.find((profile) => profile.user_id === me);
  return {
    picks: picks.data! as PastPick[],
    reads: reads.data!,
    members: profiles.data!.filter(
      (profile) => myProfile?.group_id && profile.group_id === myProfile.group_id
    ),
    inRoom: Boolean(myProfile?.group_id),
    today,
    me,
  };
}

// "read by you and sam", "read by everyone", "nobody read it".
function readLine(readerIds: string[], members: Profile[], me: string) {
  if (readerIds.length === 0) return "nobody read it";
  if (members.length > 1 && members.every((m) => readerIds.includes(m.user_id))) {
    return members.length === 2 ? "you both read it" : "everyone read it";
  }
  // You first, then everyone else.
  const names = members
    .filter((m) => readerIds.includes(m.user_id))
    .sort((a, b) => Number(b.user_id === me) - Number(a.user_id === me))
    .map((m) => (m.user_id === me ? "you" : m.display_name));
  return `read by ${listNames(names)}`;
}

export default function PastReadsPage() {
  const [data, setData] = useState<PastData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPastData()
      .then(setData)
      .catch((error) => setError(`couldn't load past reads: ${error.message}`));
  }, []);

  return (
    <>
      <section className="mt-10">
        <h1 className="text-3xl font-semibold">past reads</h1>
        <p className="mt-2 text-muted">everything the wheel has picked, newest first.</p>
      </section>

      {error && <p className="mt-8 text-muted">{error}</p>}
      {!data && !error && <p className="mt-8 text-muted">loading…</p>}

      {data && !data.inRoom && (
        <p className="mt-8 text-muted">
          you&apos;re not in a reading room yet.{" "}
          <NextLink href="/" className="underline">
            start or join one
          </NextLink>
          .
        </p>
      )}

      {data?.inRoom && data.picks.length === 0 && (
        <p className="mt-8 text-muted">
          nothing yet. once the wheel has picked something, it&apos;ll show up here the next day.
        </p>
      )}

      {data && data.picks.length > 0 && (
        <ol className="mt-8 divide-y divide-line border-y border-line">
          {data.picks.map((pick) => {
            const link = pick.links;
            const readerIds = data.reads
              .filter((read) => read.link_id === pick.link_id)
              .map((read) => read.user_id);
            return (
              <li key={pick.id} className="py-5">
                <p className="text-sm text-muted">{pickDateLabel(pick.pick_date, data.today)}</p>
                {link ? (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-words text-lg font-semibold leading-snug hover:underline"
                  >
                    {link.title ?? link.url.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                ) : (
                  // Shouldn't happen: the database won't delete a link that's been picked.
                  <p className="mt-1 text-lg font-semibold text-muted">a link that&apos;s gone</p>
                )}
                <p className="mt-1 text-sm text-muted">
                  {link && <>{publicationOf(link.url)} · </>}
                  {readLine(readerIds, data.members, data.me)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
