import type { Link } from "@/lib/types";

// "www.theguardian.com" -> "theguardian.com"
function publicationOf(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

function readLine(readCount: number) {
  if (readCount >= 2) return "you've both read it";
  if (readCount === 1) return "1 of you has read it";
  return "nobody has read it yet";
}

export default function TodayCard({
  link,
  readCount,
  markedHere,
  onMarkRead,
}: {
  link: Link;
  readCount: number;
  markedHere: boolean;
  onMarkRead: () => void;
}) {
  const publication = publicationOf(link.url);

  return (
    <article className="rounded-card border border-line p-6 sm:p-8">
      <p className="text-sm text-muted">{publication}</p>
      {/* If the site didn't share a title, the url stands in for one. */}
      <h2 className="mt-2 break-words text-2xl font-semibold leading-snug">
        {link.title ?? link.url.replace(/^https?:\/\/(www\.)?/, "")}
      </h2>
      {link.description && (
        <p className="mt-3 leading-relaxed text-muted">{link.description}</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="rounded-card bg-accent px-6 py-3 font-medium text-ink"
        >
          read it
        </a>
        <button
          onClick={onMarkRead}
          disabled={markedHere}
          className="rounded-card border border-ink px-6 py-3 font-medium disabled:border-line disabled:text-muted"
        >
          {markedHere ? "marked as read" : "mark as read"}
        </button>
      </div>

      <p className="mt-4 text-sm text-muted">{readLine(readCount)}</p>
    </article>
  );
}
