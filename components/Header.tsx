import Link from "next/link";

export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-line py-5">
      <Link href="/" className="font-semibold">
        the reading room
      </Link>
      <nav className="flex gap-5 text-sm text-muted">
        <Link href="/" className="hover:text-ink">
          today
        </Link>
        {/* The past reads page is a bonus for later. */}
        <Link href="/past-reads" className="hover:text-ink">
          past reads
        </Link>
      </nav>
    </header>
  );
}
