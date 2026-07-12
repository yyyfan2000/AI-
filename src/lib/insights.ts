import "server-only";

import type { NewsItem, UserProfile } from "@/generated/prisma/client";
import type { ChatMessage } from "@/lib/deepseek";
import { callDeepSeek, getDeepSeekKeyForUser } from "@/lib/deepseek";
import { prisma } from "@/lib/db";

type InsightPayload = {
  recommendReason: string;
  workInsight: string;
  suggestedActions: string[];
};

function arrayFromJson(value: unknown) {
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

export function fallbackInsight(profile: UserProfile, item: NewsItem): InsightPayload {
  const goals = arrayFromJson(profile.goals);
  const tags = arrayFromJson(item.tags);
  const primaryGoal = goals[0] || "提效";
  const tagText = tags.slice(0, 3).join("、") || "AI热点";

  return {
    recommendReason: `这条资讯同时命中了你的「${profile.role}」「${profile.industry}」和「${primaryGoal}」关注方向，适合用来判断近期 AI 能力变化。`,
    workInsight: `可以把「${tagText}」理解成一个业务触发器：它不是单纯新闻，而是在提醒你重新审视现有流程里是否有可被 AI 缩短、自动化或产品化的环节。`,
    suggestedActions: [
      `挑一个当前最耗时的${profile.role}任务，尝试用这条资讯里的能力改写成 AI 辅助流程。`,
      `把资讯摘要转成一页内部分享，说明它对${profile.industry}业务的潜在影响。`,
      `记录一个可验证的小实验：目标、输入材料、AI 输出、人工复核标准。`
    ]
  };
}

function parseJsonObject(text: string): InsightPayload | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as Partial<InsightPayload>;
    if (
      typeof parsed.recommendReason === "string" &&
      typeof parsed.workInsight === "string" &&
      Array.isArray(parsed.suggestedActions)
    ) {
      return {
        recommendReason: parsed.recommendReason,
        workInsight: parsed.workInsight,
        suggestedActions: parsed.suggestedActions.map(String).slice(0, 3)
      };
    }
  } catch {
    return null;
  }
  return null;
}

export async function getOrCreateInsight(userId: string, item: NewsItem) {
  const existing = await prisma.insight.findUnique({
    where: { userId_newsItemId: { userId, newsItemId: item.id } }
  });
  if (existing) return existing;

  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error("请先完成用户画像");

  let payload = fallbackInsight(profile, item);
  let provider = "rule";
  const keySource = await getDeepSeekKeyForUser(userId);

  if (keySource) {
    try {
      const content = await callDeepSeek(
        keySource.key,
        [
          {
            role: "system",
            content:
              "你是资深AI产品经理。请把AI资讯翻译成用户可执行的工作灵感。只输出JSON，不要Markdown。字段：recommendReason、workInsight、suggestedActions（3条中文短句）。"
          },
          {
            role: "user",
            content: JSON.stringify({
              user: {
                type: profile.userType,
                role: profile.role,
                industry: profile.industry,
                aiLevel: profile.aiLevel,
                goals: arrayFromJson(profile.goals),
                interestTags: arrayFromJson(profile.interestTags)
              },
              news: {
                title: item.title,
                summary: item.summary,
                source: item.source,
                tags: arrayFromJson(item.tags)
              }
            })
          }
        ],
        { maxTokens: 700, temperature: 0.35 }
      );
      payload = parseJsonObject(content) ?? payload;
      provider = `deepseek:${keySource.source}`;
    } catch {
      provider = "rule";
    }
  }

  return prisma.insight.upsert({
    where: { userId_newsItemId: { userId, newsItemId: item.id } },
    update: {
      provider,
      recommendReason: payload.recommendReason,
      workInsight: payload.workInsight,
      suggestedActions: JSON.stringify(payload.suggestedActions)
    },
    create: {
      userId,
      newsItemId: item.id,
      provider,
      recommendReason: payload.recommendReason,
      workInsight: payload.workInsight,
      suggestedActions: JSON.stringify(payload.suggestedActions)
    }
  });
}

export async function answerAdvisorQuestion(
  userId: string,
  newsItemId: string,
  messages: ChatMessage[]
) {
  const [profile, item] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.newsItem.findUnique({ where: { id: newsItemId } })
  ]);
  if (!profile || !item) throw new Error("缺少画像或资讯内容");

  const keySource = await getDeepSeekKeyForUser(userId);
  if (!keySource) {
    throw new Error("请先在设置页绑定 DeepSeek API Key 后再使用 AI 顾问。");
  }

  return callDeepSeek(
    keySource.key,
    [
      {
        role: "system",
        content:
          "你是资深AI产品经理。你正在和用户多轮对话。基于用户画像和当前AI资讯，给出具体、克制、可执行的业务建议。不要编造外部事实；不确定就说明需要进一步验证。"
      },
      {
        role: "user",
        content: JSON.stringify({
          contextOnly: true,
          user: {
            type: profile.userType,
            role: profile.role,
            industry: profile.industry,
            aiLevel: profile.aiLevel,
            goals: arrayFromJson(profile.goals),
            interestTags: arrayFromJson(profile.interestTags)
          },
          news: {
            title: item.title,
            summary: item.summary,
            source: item.source,
            tags: arrayFromJson(item.tags),
            url: item.url
          }
        })
      },
      ...messages
    ],
    { maxTokens: 1000, temperature: 0.45 }
  );
}
