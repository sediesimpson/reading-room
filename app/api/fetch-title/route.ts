// GET /api/fetch-title?url=https://...
// Downloads the article on the server and returns its og:title,
// og:description and og:image. Browsers can't read other websites
// directly (CORS), but server code can.

export type LinkDetails = {
  title: string | null;
  description: string | null;
  image: string | null;
};

const TIMEOUT_MS = 8000;
// Only the top of the page is needed; the meta tags live in <head>.
const MAX_CHARS = 500_000;

// Don't let the server be pointed at itself or at private networks.
function isPrivateHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname === "[::1]" ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

// Turns "&amp;" into "&", "&#39;" into "'", and so on.
function decodeEntities(text: string) {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isNaN(n) ? match : String.fromCodePoint(n);
    }
    return named[code.toLowerCase()] ?? match;
  });
}

// Reads every <meta property="..." content="..."> into a lookup table.
function readMetaTags(html: string) {
  const tags = new Map<string, string>();
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = new Map<string, string>();
    for (const [, name, , value] of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) {
      attrs.set(name.toLowerCase(), value);
    }
    const key = (attrs.get("property") ?? attrs.get("name"))?.toLowerCase();
    const content = attrs.get("content");
    if (key && content && !tags.has(key)) tags.set(key, decodeEntities(content).trim());
  }
  return tags;
}

function details(html: string, pageUrl: string): LinkDetails {
  const meta = readMetaTags(html);
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];

  const title = meta.get("og:title") ?? meta.get("twitter:title") ?? (titleTag ? decodeEntities(titleTag).trim() : null);
  const description = meta.get("og:description") ?? meta.get("twitter:description") ?? meta.get("description") ?? null;

  // Image links can be relative ("/img/a.jpg"), so make them full links.
  let image = meta.get("og:image") ?? meta.get("twitter:image") ?? null;
  if (image) {
    try {
      image = new URL(image, pageUrl).toString();
    } catch {
      image = null;
    }
  }

  return { title: title || null, description: description || null, image };
}

export async function GET(request: Request) {
  const empty: LinkDetails = { title: null, description: null, image: null };
  const raw = new URL(request.url).searchParams.get("url");

  let url: URL;
  try {
    url = new URL(raw ?? "");
  } catch {
    return Response.json({ error: "not a valid url" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(url.protocol) || isPrivateHost(url.hostname)) {
    return Response.json({ error: "not a public web link" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        // Some sites only share their tags with browser-looking visitors.
        "user-agent": "Mozilla/5.0 (compatible; ReadingRoomBot/1.0)",
        accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("html")) {
      return Response.json(empty);
    }
    const html = (await response.text()).slice(0, MAX_CHARS);
    return Response.json(details(html, response.url));
  } catch {
    // Timed out or the site refused: the link still gets saved, just without a title.
    return Response.json(empty);
  }
}
