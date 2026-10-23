"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase";
import { todayIso, todayLabel } from "@/lib/dates";
import type { DailyPick, Link } from "@/lib/types";
import AddLinkForm from "@/components/AddLinkForm";
import Wheel, { landingAngle, type Slice } from "@/components/Wheel";

// How many full turns the wheel makes before it lands.
const TURNS = 5;

// The date only exists in the browser; the server render leaves it blank.
function useToday() {
  return useSyncExternalStore(
    () => () => {},
    todayLabel,
    () => ""
  );
}

type PageData = { links: Link[]; picks: DailyPick[]; today: string };

// Fetches every link and every pick at once.
async function fetchPageData(): Promise<PageData> {
  const supabase = createClient();
  const [links, picks] = await Promise.all([
    supabase.from("links").select("*").order("created_at"),
    supabase.from("daily_picks").select("*"),
  ]);
  if (links.error) throw links.error;
  if (picks.error) throw picks.error;
  return { links: links.data, picks: picks.data, today: todayIso() };
}

// The wheel holds every link that wasn't picked on an earlier day.
// Today's pick stays on, so the wheel can stop on it.
function linksOnWheel({ links, picks, today }: PageData) {
  const pickedBefore = new Set(
    picks.filter((pick) => pick.pick_date < today).map((pick) => pick.link_id)
  );
  return links.filter((link) => !pickedBefore.has(link.id));
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

  return (
    <>
      <section className="mt-10 text-center">
        <p className="text-sm text-muted">{date || " "}</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          what are we reading today?
        </h1>
        <p className="mt-3 text-muted">
          {data === null
            ? "loading…"
            : `${slices.length} ${slices.length === 1 ? "link" : "links"} in the wheel`}
        </p>
      </section>

      <div className="mt-8">
        <Wheel
          slices={slices}
          rotation={rotation}
          animate={spinning}
          onSpinEnd={() => setLanded(true)}
        />
      </div>

      <div className="mt-8 text-center">
        {data && (!todayPick || spinning) && (
          <button
            onClick={handleSpin}
            disabled={spinning || slices.length === 0}
            className="rounded-card bg-ink px-8 py-4 font-medium text-white disabled:opacity-50"
          >
            {spinning ? "spinning…" : "spin the wheel"}
          </button>
        )}
        {/* A placeholder result. Step 5 turns this into the article card. */}
        {pickedLink && !spinning && (
          <p>
            today&apos;s pick:{" "}
            <a href={pickedLink.url} target="_blank" rel="noreferrer" className="underline">
              {pickedLink.url}
            </a>
          </p>
        )}
        {error && <p className="mt-3 text-sm text-muted">{error}</p>}
      </div>

      <AddLinkForm onAdded={loadData} />
    </>
  );
}
