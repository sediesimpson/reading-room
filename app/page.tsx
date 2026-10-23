"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase";
import { timeLabel, todayIso, todayLabel } from "@/lib/dates";
import type { DailyPick, Link, Read } from "@/lib/types";
import AddLinkForm from "@/components/AddLinkForm";
import TodayCard from "@/components/TodayCard";
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

// Until login (step 7), this browser remembers which links it marked as
// read, so one person can't count twice.
function markedInThisBrowser(linkId: number) {
  try {
    return localStorage.getItem(`read-${linkId}`) === "yes";
  } catch {
    return false;
  }
}
function rememberMarked(linkId: number) {
  try {
    localStorage.setItem(`read-${linkId}`, "yes");
  } catch {
    // Private windows can block storage; the read is still saved.
  }
}

type PageData = {
  links: Link[];
  picks: DailyPick[];
  reads: Read[];
  today: string;
  markedHere: boolean;
};

// Fetches every link, pick and read at once.
async function fetchPageData(): Promise<PageData> {
  const supabase = createClient();
  const [links, picks, reads] = await Promise.all([
    supabase.from("links").select("*").order("created_at"),
    supabase.from("daily_picks").select("*"),
    supabase.from("reads").select("*"),
  ]);
  if (links.error) throw links.error;
  if (picks.error) throw picks.error;
  if (reads.error) throw reads.error;

  const today = todayIso();
  const todayPick = picks.data.find((pick) => pick.pick_date === today);
  return {
    links: links.data,
    picks: picks.data,
    reads: reads.data,
    today,
    markedHere: todayPick ? markedInThisBrowser(todayPick.link_id) : false,
  };
}

function readCount(reads: Read[], linkId: number) {
  return reads.filter((read) => read.link_id === linkId).length;
}

// The wheel holds every link you haven't both read.
// Today's pick always stays on, so the small wheel can stop on it.
function linksOnWheel({ links, picks, reads, today }: PageData) {
  const todayPick = picks.find((pick) => pick.pick_date === today);
  return links.filter(
    (link) => link.id === todayPick?.link_id || readCount(reads, link.id) < 2
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

  // For now every slice is pale blue. Step 7 colours them by who added them.
  const slices: Slice[] = wheelLinks.map((link) => ({
    id: link.id,
    color: "var(--color-accent)",
  }));

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
    const { error } = await createClient().from("reads").insert({ link_id: pickedLink.id });
    if (error) {
      setError(`couldn't mark it as read: ${error.message}`);
      return;
    }
    rememberMarked(pickedLink.id);
    loadData();
  }

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
              readCount={readCount(data.reads, pickedLink.id)}
              markedHere={data.markedHere}
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
                : `${slices.length} ${slices.length === 1 ? "link" : "links"} in the wheel`}
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
    </>
  );
}
