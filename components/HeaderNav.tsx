"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

// The links on the right of the header.
export default function HeaderNav() {
  const pathname = usePathname();
  // The page you're on shows in black.
  const linkClass = (href: string) =>
    pathname === href ? "font-medium text-ink" : "hover:text-ink";

  return (
    <nav className="flex shrink-0 gap-5 text-sm text-muted">
      <Link href="/" className={linkClass("/")}>
        today
      </Link>
      <Link href="/past-reads" className={linkClass("/past-reads")}>
        past reads
      </Link>
      <LogoutButton />
    </nav>
  );
}
