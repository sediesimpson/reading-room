"use client";

import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ROOM_CHANGED } from "@/lib/rooms";

type Room = { id: string; name: string };
type RoomData = { rooms: Room[]; currentId: string | null };

// Every room you're in, and which one you're looking at.
async function fetchRooms(): Promise<RoomData> {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims.sub;
  if (!me) return { rooms: [], currentId: null };

  const [rooms, profile] = await Promise.all([
    supabase.from("groups").select("id, name").order("name"),
    supabase.from("profiles").select("group_id").eq("user_id", me).maybeSingle(),
  ]);
  return { rooms: rooms.data ?? [], currentId: profile.data?.group_id ?? null };
}

// " / sunday papers ▾" after the app name: switch rooms, start one, or leave.
export default function RoomMenu() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<RoomData | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load now, after any room change, and after logging in or out.
  useEffect(() => {
    const supabase = createClient();
    const load = () => fetchRooms().then(setData);

    load();
    window.addEventListener(ROOM_CHANGED, load);
    const { data: auth } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      window.removeEventListener(ROOM_CHANGED, load);
      auth.subscription.unsubscribe();
    };
  }, []);

  // Close when you click outside the menu or press Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setConfirmLeave(false);
    setError(null);
  }

  async function handleSwitch(roomId: string) {
    if (roomId === data?.currentId) return close();
    setBusy(true);
    const { error } = await createClient().rpc("switch_room", { room: roomId });
    setBusy(false);
    if (error) return setError(error.message);
    close();
    window.dispatchEvent(new Event(ROOM_CHANGED));
  }

  async function handleLeave() {
    setBusy(true);
    const { error } = await createClient().rpc("leave_room");
    setBusy(false);
    if (error) return setError(error.message);
    close();
    window.dispatchEvent(new Event(ROOM_CHANGED));
    router.push("/");
  }

  const current = data?.rooms.find((room) => room.id === data.currentId);
  if (!current) return null;

  return (
    <div ref={menuRef} className="relative flex min-w-0 font-semibold">
      <span className="mx-2 shrink-0 text-line">/</span>
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-w-0 items-center gap-1 text-muted hover:text-ink"
      >
        {/* Long names end in "…" on narrow screens. */}
        <span className="truncate">{current.name}</span>
        <span aria-hidden className="shrink-0 text-xs">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-10 mt-3 w-64 rounded-card border border-line bg-white p-2 text-sm font-normal shadow-lg"
        >
          <p className="px-3 pb-1 pt-2 text-xs text-muted">your rooms</p>
          {data!.rooms.map((room) => (
            <button
              key={room.id}
              role="menuitem"
              onClick={() => handleSwitch(room.id)}
              disabled={busy}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent"
            >
              <span className="truncate">{room.name}</span>
              {room.id === current.id && <span aria-label="current room">✓</span>}
            </button>
          ))}

          <div className="my-2 border-t border-line" />
          <NextLink
            href="/rooms/new"
            role="menuitem"
            onClick={close}
            className="block rounded-lg px-3 py-2 hover:bg-accent"
          >
            start a new room
          </NextLink>

          {confirmLeave ? (
            <div className="px-3 py-2">
              <p>leave {current.name}?</p>
              <p className="mt-1 text-xs text-muted">
                your links stay in its wheel. you&apos;ll need an invite to come back.
              </p>
              <div className="mt-2 flex gap-3">
                <button onClick={handleLeave} disabled={busy} className="font-medium underline">
                  {busy ? "leaving…" : "yes, leave"}
                </button>
                <button onClick={() => setConfirmLeave(false)} className="text-muted underline">
                  cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              role="menuitem"
              onClick={() => setConfirmLeave(true)}
              className="block w-full rounded-lg px-3 py-2 text-left text-muted hover:bg-accent hover:text-ink"
            >
              leave this room
            </button>
          )}
          {error && <p className="px-3 py-2 text-xs text-muted">{error}</p>}
        </div>
      )}
    </div>
  );
}
