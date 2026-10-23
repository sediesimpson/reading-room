import type { LinkDetails } from "@/app/api/fetch-title/route";

// Returns the cleaned-up url, or null if it isn't a real web link.
// Cleaning up means the same article always saves as the same text,
// so the database can spot duplicates.
export function checkUrl(text: string): string | null {
  try {
    const url = new URL(text.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;

    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_")) url.searchParams.delete(key);
    }
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return null;
  }
}

// Asks our own server route for the article's title, description and image.
// If that fails, the link is still worth saving without them.
export async function fetchDetails(url: string): Promise<LinkDetails> {
  try {
    const response = await fetch(`/api/fetch-title?url=${encodeURIComponent(url)}`);
    if (response.ok) return await response.json();
  } catch {
    // Fall through to no details.
  }
  return { title: null, description: null, image: null };
}

// "https://www.theguardian.com/..." -> "theguardian.com"
export function publicationOf(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}
