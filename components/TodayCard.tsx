import { publicationOf } from "@/lib/links";
import { listNames } from "@/lib/names";
import type { Link } from "@/lib/types";

function readLine(readByMe: boolean, othersRead: string[], othersWaiting: string[]) {
  if (readByMe && othersWaiting.length === 0) {
    if (othersRead.length === 0) return "you've read it";
    return othersRead.length === 1 ? "you've both read it" : "you've all read it";
  }
  if (readByMe) return `you've read it. waiting on ${listNames(othersWaiting)}.`;
  if (othersRead.length > 0) {
    return `${listNames(othersRead)} ${othersRead.length === 1 ? "has" : "have"} read it`;
  }
  return "nobody has read it yet";
}

export default function TodayCard({
  link,
  readByMe,
  othersRead,
  othersWaiting,
  onMarkRead,
}: {
  link: Link;
  readByMe: boolean;
  // Names of the others in your room who have and haven't read it.
  othersRead: string[];
  othersWaiting: string[];
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
          disabled={readByMe}
          className="rounded-card border border-ink px-6 py-3 font-medium disabled:border-line disabled:text-muted"
        >
          {readByMe ? "marked as read" : "mark as read"}
        </button>
      </div>

      <p className="mt-4 text-sm text-muted">{readLine(readByMe, othersRead, othersWaiting)}</p>
    </article>
  );
}
