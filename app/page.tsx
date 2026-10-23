"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase";
import type { Link } from "@/lib/types";
import AddLinkForm from "@/components/AddLinkForm";

// e.g. "friday 23 october", in South African time.
function todayLabel() {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Johannesburg",
  }).format(new Date());
}

// The date only exists in the browser; the server render leaves it blank.
function useToday() {
  return useSyncExternalStore(
    () => () => {},
    todayLabel,
    () => ""
  );
}

function fetchLinks() {
  return createClient().from("links").select("*").order("created_at");
}

export default function Home() {
  const [links, setLinks] = useState<Link[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const date = useToday();

  // Ask Supabase for every link, then show them once they arrive.
  const loadLinks = useCallback(() => {
    fetchLinks().then(({ data, error }) => {
      if (error) setError(error.message);
      else setLinks(data);
    });
  }, []);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const count = links?.length ?? 0;

  return (
    <>
      <section className="mt-10 text-center">
        <p className="text-sm text-muted">{date || " "}</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          what are we reading today?
        </h1>
        <p className="mt-3 text-muted">
          {error
            ? `couldn't load the wheel: ${error}`
            : links === null
              ? "loading…"
              : `${count} ${count === 1 ? "link" : "links"} in the wheel`}
        </p>
      </section>

      <AddLinkForm onAdded={loadLinks} />
    </>
  );
}
