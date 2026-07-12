import "server-only";

import type { NewsItem } from "@/generated/prisma/client";

const contentKeys = [
  "original",
  "originalText",
  "original_text",
  "article",
  "articleText",
  "article_text",
  "body",
  "text",
  "content",
  "fullText",
  "full_text"
];

function decodeHtml(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    lt: "<",
    nbsp: " ",
    quot: '"'
  };

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (code.startsWith("#x")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
      if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
      return namedEntities[code.toLowerCase()] ?? entity;
    })
    .trim();
}

function readCachedText(item: NewsItem) {
  if (!item.raw) return null;

  try {
    const raw = JSON.parse(item.raw) as Record<string, unknown>;
    for (const key of contentKeys) {
      const value = raw[key];
      if (typeof value === "string" && value.trim().length > item.summary.length + 80) {
        return value.trim();
      }
    }
  } catch {
    return null;
  }

  return null;
}

function readAihotPermalink(item: NewsItem) {
  if (!item.raw) return null;

  try {
    const raw = JSON.parse(item.raw) as Record<string, unknown>;
    return typeof raw.permalink === "string" && raw.permalink.startsWith("https://aihot.virxact.com/items/")
      ? raw.permalink
      : null;
  } catch {
    return null;
  }
}

async function fetchAihotText(permalink: string) {
  try {
    const response = await fetch(permalink, {
      next: { revalidate: 60 * 60 },
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/138 Safari/537.36"
      }
    });
    if (!response.ok) return null;

    const html = await response.text();
    const paragraphs = Array.from(
      html.matchAll(/<p\s+class="[^"]*\bdt-p\b[^"]*"[^>]*>([\s\S]*?)<\/p>/gi),
      (match) => decodeHtml(match[1])
    ).filter(Boolean);

    return paragraphs.length > 0 ? [...new Set(paragraphs)].join("\n\n") : null;
  } catch {
    return null;
  }
}

export async function getOriginalText(item: NewsItem) {
  const cachedText = readCachedText(item);
  if (cachedText) return { text: cachedText, isFullText: true };

  const permalink = readAihotPermalink(item);
  const aihotText = permalink ? await fetchAihotText(permalink) : null;
  if (aihotText) return { text: aihotText, isFullText: true };

  return { text: item.summary, isFullText: false };
}
