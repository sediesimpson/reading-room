"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

// The links on the right of the header. Hidden on the login page, where
// none of them would work yet.
export default function HeaderNav() {
  if (usePathname() === "/login") return null;

  return (
    <nav className="flex shrink-0 gap-5 text-sm text-muted">
      <Link href="/" className="hover:text-ink">
        today
      </Link>
      {/* The past reads page is a bonus for later. */}
      <Link href="/past-reads" className="hover:text-ink">
        past reads
      </Link>
      <LogoutButton />
    </nav>
  );
}
