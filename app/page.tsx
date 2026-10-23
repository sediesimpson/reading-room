"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase";
import { timeLabel, todayIso, todayLabel } from "@/lib/dates";
import type { DailyPick, Group, Link, Profile, Read, WheelSlice } from "@/lib/types";
import AddLinkForm from "@/components/AddLinkForm";
import GroupSetup from "@/components/GroupSetup";
import InviteBox from "@/components/InviteBox";
import NamePrompt from "@/components/NamePrompt";
import TodayCard from "@/components/TodayCard";
import YourLinks from "@/components/YourLinks";
import Wheel, { landingAngle, type Slice } from "@/components/Wheel";

// How many full turns the wheel makes before it lands.
const TURNS = 5;
// How long to linger on the stopped wheel before showing the article.
const PAUSE_MS = 900;

// The date only exists in the browser; the server render leaves it blank.
function useToday() {
  return useSyncExternalStore(
    () => () => {},
    todayLabel,
    () => ""
  );
}

type PageData = {
  // Every link in your room, as a bare slice (no url or title).
  wheel: WheelSlice[];
  // Full details, but only for your own links and links that have been picked.
  links: Link[];
  picks: DailyPick[];
  reads: Read[];
  // Everyone in your room, you included.
  members: Profile[];
  // You, and your room (null until you set a name and join one).
  myProfile: Profile | null;
  group: Group | null;
  today: string;
  // The logged-in user's id.
  me: string;
};

// Fetches who's logged in, plus your room's links, picks, reads and people.
// The database's rules only ever send back rows from your own room.
async function fetchPageData(): Promise<PageData> {
  const supabase = createClient();
  const [claims, wheel, links, picks, reads, profiles, groups] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.rpc("wheel_slices"),
    supabase.from("links").select("*").order("created_at"),
    supabase.from("daily_picks").select("*"),
    supabase.from("reads").select("*"),
    supabase.from("profiles").select("*"),
    supabase.from("groups").select("*"),
  ]);
  for (const result of [wheel, links, picks, reads, profiles, groups]) {
    if (result.error) throw result.error;
  }
  const me = claims.data?.claims.sub;
  if (!me) throw new Error("you're not logged in");

  const myProfile = profiles.data!.find((profile) => profile.user_id === me) ?? null;
  return {
    wheel: wheel.data!,
    links: links.data!,
    picks: picks.data!,
    reads: reads.data!,
    members: profiles.data!.filter(
      (profile) => myProfile?.group_id && profile.group_id === myProfile.group_id
    ),
    myProfile,
    group: groups.data![0] ?? null,
    today: todayIso(),
    me,
  };
}

function readCount(reads: Read[], linkId: number) {
  return reads.filter((read) => read.link_id === linkId).length;
}

// The wheel holds every link that not everyone has read yet.
// Today's pick always stays on, so the small wheel can stop on it.
function linksOnWheel({ wheel, picks, reads, members, today }: PageData) {
  const todayPick = picks.find((pick) => pick.pick_date === today);
  const everyone = Math.max(members.length, 1);
  return wheel.filter(
    (slice) => slice.id === todayPick?.link_id || readCount(reads, slice.id) < everyone
  );
}

export default function Home() {
  const [data, setData] = useState<PageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set while a spin is animating: the angle the wheel is heading for.
  const [spinTo, setSpinTo] = useState<number | null>(null);
  const [landed, setLanded] = useState(false);
  const date = useToday();

  const loadData = useCallback(() => {
    fetchPageData()
      .then(setData)
      .catch((error) => setError(`couldn't load the wheel: ${error.message}`));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const wheelLinks = data ? linksOnWheel(data) : [];
  const todayPick = data?.picks.find((pick) => pick.pick_date === data.today);
  const pickedLink = data?.links.find((link) => link.id === todayPick?.link_id);
  const winnerIndex = wheelLinks.findIndex((link) => link.id === todayPick?.link_id);

  const me = data?.me;
  const others = data?.members.filter((profile) => profile.user_id !== me) ?? [];

  // Your slices are pale blue, everyone else's are green.
  const slices: Slice[] = wheelLinks.map((link) => ({
    id: link.id,
    color: link.added_by === me ? "var(--color-accent)" : "var(--color-friend)",
  }));
  // Your own links on the wheel, with their full details for the list.
  const onWheel = new Set(wheelLinks.map((slice) => slice.id));
  const myLinks =
    data?.links.filter((link) => link.added_by === me && onWheel.has(link.id)) ?? [];
  const fromMe = wheelLinks.filter((slice) => slice.added_by === me).length;
  // Links that have been picked on any day can't be edited or deleted.
  const pickedIds = new Set(data?.picks.map((pick) => pick.link_id));
  const fromOthers = wheelLinks.length - fromMe;
  const linkCount = `${slices.length} ${slices.length === 1 ? "link" : "links"}`;
  const countLine =
    others.length === 0
      ? `${linkCount} in the wheel`
      : `${linkCount}: ${fromMe} from you, ${fromOthers} from ${
          others.length === 1 ? others[0].display_name : "the others"
        }`;

  // Who has (and hasn't) read today's pick.
  const todayReads = data?.reads.filter((read) => read.link_id === todayPick?.link_id) ?? [];
  const hasRead = (userId: string) => todayReads.some((read) => read.user_id === userId);
  const readByMe = me ? hasRead(me) : false;
  const othersRead = others.filter((p) => hasRead(p.user_id)).map((p) => p.display_name);
  const othersWaiting = others.filter((p) => !hasRead(p.user_id)).map((p) => p.display_name);

  // Mid-spin, the wheel heads for spinTo. Otherwise it rests on today's pick
  // (the same spot, minus the extra full turns, so nothing visibly moves).
  const spinning = spinTo !== null && !landed;
  let rotation = 0;
  if (spinning) rotation = spinTo;
  else if (winnerIndex >= 0) rotation = landingAngle(winnerIndex, slices.length);

  async function handleSpin() {
    setError(null);
    const { data: pick, error } = await createClient().rpc("spin");
    if (error) {
      setError(`couldn't spin: ${error.message}`);
      return;
    }
    if (!pick?.link_id) {
      setError("there's nothing in the wheel to pick. add a link first.");
      return;
    }

    // Reload so the wheel matches the database, then aim at the winner.
    try {
      const fresh = await fetchPageData();
      const freshWheel = linksOnWheel(fresh);
      const index = freshWheel.findIndex((link) => link.id === pick.link_id);
      setData(fresh);
      setLanded(false);
      setSpinTo(TURNS * 360 + landingAngle(index, freshWheel.length));
    } catch (error) {
      setError(`couldn't load the wheel: ${(error as Error).message}`);
    }
  }

  async function handleMarkRead() {
    if (!pickedLink) return;
    // user_id fills itself in with whoever is logged in.
    const { error } = await createClient().from("reads").insert({ link_id: pickedLink.id });
    // 23505: you'd already marked it (perhaps in another tab). That's fine.
    if (error && error.code !== "23505") {
      setError(`couldn't mark it as read: ${error.message}`);
      return;
    }
    loadData();
  }

  // First visit: ask for a name, then for a room, before anything else.
  if (data && !data.myProfile) return <NamePrompt onSaved={loadData} />;
  if (data && !data.group) return <GroupSetup onCreated={loadData} />;

  // Two states: no pick yet (big wheel and spin), or a pick (article first).
  const showArticle = data && todayPick && pickedLink && !spinning;

  return (
    <>
      {showArticle ? (
        <>
          <section className="mt-10">
            <p className="text-sm text-muted">{date || " "}</p>
            <h1 className="mt-2 text-3xl font-semibold">today&apos;s read</h1>
          </section>

          <div className="mt-6">
            <TodayCard
              link={pickedLink}
              readByMe={readByMe}
              othersRead={othersRead}
              othersWaiting={othersWaiting}
              onMarkRead={handleMarkRead}
            />
          </div>

          <div className="mt-8 flex items-center gap-5">
            <div className="w-[120px] shrink-0">
              <Wheel slices={slices} size={120} rotation={rotation} />
            </div>
            <div>
              <p className="font-medium">spun at {timeLabel(todayPick.spun_at)}</p>
              <p className="mt-1 text-sm text-muted">
                picked from {slices.length} {slices.length === 1 ? "link" : "links"}.
                the next spin is tomorrow.
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <section className="mt-10 text-center">
            <p className="text-sm text-muted">{date || " "}</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
              what are we reading today?
            </h1>
            <p className="mt-3 text-muted">
              {data === null
                ? error
                  ? " "
                  : "loading…"
                : countLine}
            </p>
          </section>

          <div className="mt-8">
            <Wheel
              slices={slices}
              rotation={rotation}
              animate={spinning}
              onSpinEnd={() => setTimeout(() => setLanded(true), PAUSE_MS)}
            />
          </div>

          <div className="mt-8 text-center">
            {data && (
              <button
                onClick={handleSpin}
                disabled={spinning || slices.length === 0}
                className="rounded-card bg-ink px-8 py-4 font-medium text-white disabled:opacity-50"
              >
                {spinning ? "spinning…" : "spin the wheel"}
              </button>
            )}
          </div>
        </>
      )}

      {error && <p className="mt-4 text-center text-sm text-muted">{error}</p>}

      <AddLinkForm onAdded={loadData} />
      <YourLinks links={myLinks} pickedIds={pickedIds} onChanged={loadData} />
      {data?.group && <InviteBox group={data.group} />}
    </>
  );
}
