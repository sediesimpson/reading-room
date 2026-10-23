import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import RoomName from "@/components/RoomName";

export default function Header() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line py-5">
      <div className="flex min-w-0 items-baseline">
        <Link href="/" className="shrink-0 font-semibold">
          the reading room
        </Link>
        <RoomName />
      </div>
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
    </header>
  );
}
