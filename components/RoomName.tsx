"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";

// Fired after you create or join a room, so the header can update.
export const ROOM_CHANGED = "room-changed";

// " / sunday papers" after the app name, once you're in a room.
export default function RoomName() {
  const pathname = usePathname();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const load = () =>
      supabase
        .from("groups")
        .select("name")
        .maybeSingle()
        .then(({ data }) => setName(data?.name ?? null));

    load();
    window.addEventListener(ROOM_CHANGED, load);
    // Logging in or out changes which room (if any) is yours.
    const { data: auth } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      window.removeEventListener(ROOM_CHANGED, load);
      auth.subscription.unsubscribe();
    };
  }, [pathname]);

  if (!name || pathname === "/login") return null;

  return (
    <span className="flex min-w-0 font-semibold">
      <span className="mx-2 shrink-0 text-line">/</span>
      {/* Long names end in "…" on narrow screens. */}
      <span className="truncate text-muted">{name}</span>
    </span>
  );
}
