"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderNav from "@/components/HeaderNav";
import RoomName from "@/components/RoomName";

export default function Header() {
  // The login page has its own big title instead.
  if (usePathname() === "/login") return null;

  return (
    <header className="flex items-center justify-between gap-4 border-b border-line py-5">
      <div className="flex min-w-0 items-baseline">
        <Link href="/" className="shrink-0 font-semibold">
          the reading room
        </Link>
        <RoomName />
      </div>
      <HeaderNav />
    </header>
  );
}
