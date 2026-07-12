import "server-only";

import type { NewsItem, UserProfile } from "@/generated/prisma/client";
import { refreshAihotItems } from "@/lib/aihot";
import { normalizeArchiveDate, todayInShanghai } from "@/lib/date";
import { prisma } from "@/lib/db";
import { getOrCreateInsight } from "@/lib/insights";

type ScoredItem = NewsItem & {
  relevanceScore: number;
  scoreReasons: string[];
};

function jsonArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function includesAny(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

function scoreItem(
  item: NewsItem,
  profile: UserProfile,
  actionMap: Map<string, Set<string>>
): ScoredItem {
  const tags = jsonArray(item.tags);
  const goals = jsonArray(profile.goals);
  const interests = jsonArray(profile.interestTags);
  const haystack = `${item.title} ${item.summary} ${tags.join(" ")} ${item.source}`;
  const reasons: string[] = [];

  let score = Math.min(item.heatScore, 100) * 0.22;

  if (includesAny(haystack, [profile.role])) {
    score += 18;
    reasons.push(`匹配你的职业：${profile.role}`);
  }
  if (includesAny(haystack, [profile.industry])) {
    score += 16;
    reasons.push(`匹配你的行业：${profile.industry}`);
  }

  const matchedGoals = goals.filter((goal) => includesAny(haystack, [goal]));
  score += matchedGoals.length * 10;
  if (matchedGoals.length) reasons.push(`贴近目标：${matchedGoals.join("、")}`);

  const matchedTags = interests.filter((tag) => includesAny(haystack, [tag]));
  score += matchedTags.length * 8;
  if (matchedTags.length) reasons.push(`命中兴趣：${matchedTags.join("、")}`);

  const recentHours = (Date.now() - item.publishedAt.getTime()) / 36e5;
  if (recentHours < 24) score += 10;
  else if (recentHours < 72) score += 5;

  const actions = actionMap.get(item.id) ?? new Set<string>();
  if (actions.has("saved")) {
    score += 18;
    reasons.push("你收藏过这类内容");
  }
  if (actions.has("hidden")) score -= 40;
  if (actions.has("read")) score -= 12;

  if (!reasons.length) reasons.push("热度较高，适合作为今日 AI 趋势观察");

  return {
    ...item,
    relevanceScore: Math.max(0, Math.round(score)),
    scoreReasons: reasons.slice(0, 3)
  };
}

async function buildRecommendations(userId: string, limit: number) {
  const [profile, refreshResult] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    refreshAihotItems()
  ]);
  if (!profile) throw new Error("请先完成用户画像");

  const [items, actions] = await Promise.all([
    prisma.newsItem.findMany({
      orderBy: [{ publishedAt: "desc" }, { heatScore: "desc" }],
      take: 80
    }),
    prisma.userNewsAction.findMany({ where: { userId } })
  ]);

  const actionMap = new Map<string, Set<string>>();
  for (const action of actions) {
    const set = actionMap.get(action.newsItemId) ?? new Set<string>();
    set.add(action.type);
    actionMap.set(action.newsItemId, set);
  }

  const scored = items
    .map((item) => scoreItem(item, profile, actionMap))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);

  const withInsights = await Promise.all(
    scored.map(async (item) => ({
      item,
      insight: await getOrCreateInsight(userId, item),
      actions: Array.from(actionMap.get(item.id) ?? [])
    }))
  );

  return {
    refreshError: refreshResult.error,
    items: withInsights
  };
}

export async function getRecommendations(userId: string, limit = 20) {
  return buildRecommendations(userId, limit);
}

export async function getDailyRecommendations(userId: string, requestedDate?: string) {
  const date = normalizeArchiveDate(requestedDate);
  let archived = await prisma.dailyRecommendation.findMany({
    where: { userId, date },
    include: { newsItem: true },
    orderBy: { rank: "asc" }
  });
  let refreshError: string | null = null;

  if (archived.length === 0 && date === todayInShanghai()) {
    const generated = await buildRecommendations(userId, 20);
    refreshError = generated.refreshError;

    await prisma.$transaction(
      generated.items.map(({ item }, index) =>
        prisma.dailyRecommendation.upsert({
          where: {
            userId_date_rank: { userId, date, rank: index + 1 }
          },
          update: {},
          create: {
            userId,
            newsItemId: item.id,
            date,
            rank: index + 1,
            relevanceScore: item.relevanceScore,
            scoreReasons: JSON.stringify(item.scoreReasons)
          }
        })
      )
    );

    archived = await prisma.dailyRecommendation.findMany({
      where: { userId, date },
      include: { newsItem: true },
      orderBy: { rank: "asc" }
    });
  }

  const actions = await prisma.userNewsAction.findMany({ where: { userId } });
  const actionMap = new Map<string, Set<string>>();
  for (const action of actions) {
    const set = actionMap.get(action.newsItemId) ?? new Set<string>();
    set.add(action.type);
    actionMap.set(action.newsItemId, set);
  }

  const items = await Promise.all(
    archived.map(async (entry) => ({
      item: {
        ...entry.newsItem,
        relevanceScore: entry.relevanceScore,
        scoreReasons: jsonArray(entry.scoreReasons)
      },
      insight: await getOrCreateInsight(userId, entry.newsItem),
      actions: Array.from(actionMap.get(entry.newsItemId) ?? [])
    }))
  );

  return { date, items, refreshError, isEmpty: archived.length === 0 };
}

export async function getRecommendationDates(userId: string) {
  const rows = await prisma.dailyRecommendation.findMany({
    where: { userId },
    select: { date: true },
    distinct: ["date"],
    orderBy: { date: "desc" },
    take: 60
  });
  return rows.map((row) => row.date);
}

export async function markNewsAction(userId: string, newsItemId: string, type: string) {
  const actionType = type === "viewed" ? "read" : type;
  await prisma.userNewsAction.upsert({
    where: {
      userId_newsItemId_type: {
        userId,
        newsItemId,
        type: actionType
      }
    },
    update: { createdAt: new Date() },
    create: { userId, newsItemId, type: actionType }
  });
}

export async function toggleNewsAction(userId: string, newsItemId: string, type: string) {
  const existing = await prisma.userNewsAction.findUnique({
    where: {
      userId_newsItemId_type: {
        userId,
        newsItemId,
        type
      }
    }
  });

  if (existing) {
    await prisma.userNewsAction.delete({ where: { id: existing.id } });
    return false;
  }

  await markNewsAction(userId, newsItemId, type);
  return true;
}

export async function getMemorySummary(userId: string) {
  const actions = await prisma.userNewsAction.findMany({
    where: { userId },
    include: { newsItem: true },
    orderBy: { createdAt: "desc" },
    take: 40
  });

  return {
    saved: actions.filter((action) => action.type === "saved"),
    read: actions.filter((action) => action.type === "read"),
    hidden: actions.filter((action) => action.type === "hidden")
  };
}
