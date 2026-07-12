import "server-only";

import type { NewsItem, UserProfile } from "@/generated/prisma/client";
import { callDeepSeek, getDeepSeekKeyForUser } from "@/lib/deepseek";
import { prisma } from "@/lib/db";
import { parseStringArray } from "@/lib/json";

export type ReportSource = {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  supports: string;
};

export type DailyReport = {
  generatedBy: "deepseek" | "rule";
  title: string;
  executiveSummary: string;
  relevanceAnalyses: Array<{
    title: string;
    what: string;
    importance: string;
    businessRelation: string;
    trend: string;
    opportunityOrRisk: string;
  }>;
  businessAnalyses: Array<{
    area: string;
    painPoint: string;
    metric: string;
    requiredCapabilities: string;
    fitJudgement: string;
  }>;
  actions: Array<{
    name: string;
    scenario: string;
    targetUser: string;
    problem: string;
    productPlan: string;
    expectedBenefit: string;
    keyMetric: string;
    mvp: string;
    risk: string;
  }>;
  priorities: Array<{
    action: string;
    businessValue: string;
    difficulty: string;
    resources: string;
    risk: string;
    priority: string;
    reason: string;
  }>;
  sources: ReportSource[];
};

type RecommendationForReport = {
  item: NewsItem & { relevanceScore: number };
};

function sourceOf(item: NewsItem, supports: string): ReportSource {
  return {
    title: item.title,
    source: item.source,
    publishedAt: item.publishedAt.toLocaleDateString("zh-CN"),
    url: item.url,
    supports
  };
}

function fallbackDailyReport(profile: UserProfile, items: RecommendationForReport[]): DailyReport {
  const top = items.slice(0, 5);
  const primary = top[0]?.item;
  const role = profile.role;
  const industry = profile.industry;
  const goals = parseStringArray(profile.goals).join("、") || "提效、业务增长";

  return {
    generatedBy: "rule",
    title: `${industry}${role}的 AI 业务机会报告`,
    executiveSummary: `今天最值得关注的不是单条新闻本身，而是这些资讯共同指向的变化：AI 能力正在从单点工具进入更长链路的业务流程。对${industry}${role}而言，适合先围绕「${goals}」做小范围 MVP，而不是直接启动大规模系统改造。`,
    relevanceAnalyses: top.map(({ item }) => ({
      title: item.title,
      what: item.summary,
      importance: `这条资讯反映了 ${parseStringArray(item.tags).slice(0, 3).join("、") || "AI应用"} 方向的能力或市场变化。`,
      businessRelation: `它可以帮助${industry}业务重新审视${role}工作中的信息处理、决策辅助或流程自动化环节。`,
      trend: "AI 正在从内容生成走向任务执行、知识沉淀和业务流程协同。",
      opportunityOrRisk:
        "机会是用低成本实验验证提效和增长空间；风险是过早追逐热点、缺少业务数据和人工复核机制。"
    })),
    businessAnalyses: [
      {
        area: "需求洞察与方案设计",
        painPoint: "热点很多但难以转成与当前业务相关的产品判断。",
        metric: "方案产出周期、需求命中率、内部评审通过率。",
        requiredCapabilities: "需要资讯筛选、业务标签体系、用户反馈数据和人工复核流程。",
        fitJudgement: "适合当前阶段先做，因为可以用轻量流程验证，不依赖复杂系统集成。"
      },
      {
        area: "运营与客户沟通",
        painPoint: "AI 趋势难以转成客户能理解的价值表达。",
        metric: "内容生产效率、线索转化率、客户响应速度。",
        requiredCapabilities: "需要客户分层、行业案例库、内容模板和审核规范。",
        fitJudgement: "适合做小范围试点，但需要避免夸大 AI 能力。"
      }
    ],
    actions: [
      {
        name: "AI 热点到业务实验卡",
        scenario: "每日浏览高相关资讯后沉淀一个可验证实验。",
        targetUser: role,
        problem: "资讯停留在阅读层，无法进入业务动作。",
        productPlan: "为每条重点资讯生成实验目标、输入材料、操作步骤和复盘指标。",
        expectedBenefit: "提升热点转化为方案和实验的效率。",
        keyMetric: "每周生成实验数、实验完成率、被采纳方案数。",
        mvp: "先用推荐资讯 + 规则/AI 模板生成实验卡。",
        risk: "建议可能过泛，需要人工选择和补充上下文。"
      },
      {
        name: "行业机会晨会材料",
        scenario: "团队晨会或周会前快速准备业务讨论材料。",
        targetUser: `${industry}团队负责人、${role}`,
        problem: "团队对 AI 热点理解不一致，讨论难聚焦。",
        productPlan: "把 3-5 条相关资讯聚合成机会、风险、行动和来源引用。",
        expectedBenefit: "降低同步成本，提升业务决策讨论质量。",
        keyMetric: "晨报打开率、会议引用次数、后续任务创建数。",
        mvp: "先生成当前页面这类结构化报告。",
        risk: "需要确保事实标注来源，避免报告看起来像结论先行。"
      },
      {
        name: "客户/用户痛点映射",
        scenario: "把 AI 能力映射到当前用户旅程或客户流程。",
        targetUser: "业务负责人、产品经理、运营",
        problem: "不知道新技术应该放进哪个业务环节。",
        productPlan: "按获客、转化、交付、服务、复购拆解可结合点。",
        expectedBenefit: "找到更接近业务指标的 AI 应用切入点。",
        keyMetric: "痛点命中率、试点转化率、单环节效率提升。",
        mvp: "先围绕一个核心用户旅程做手动映射。",
        risk: "需要真实业务数据，否则容易停留在脑暴。"
      }
    ],
    priorities: [
      {
        action: "AI 热点到业务实验卡",
        businessValue: "高",
        difficulty: "低",
        resources: "低",
        risk: "中",
        priority: "P0",
        reason: "最贴近当前产品核心价值，能快速验证用户是否愿意把资讯转成行动。"
      },
      {
        action: "行业机会晨会材料",
        businessValue: "中高",
        difficulty: "中",
        resources: "中",
        risk: "中",
        priority: "P1",
        reason: "适合提升留存和团队传播，但需要更稳定的报告质量。"
      },
      {
        action: "客户/用户痛点映射",
        businessValue: "高",
        difficulty: "中高",
        resources: "中",
        risk: "中高",
        priority: "P2",
        reason: "价值大，但依赖用户输入更多业务上下文，适合第二阶段增强。"
      }
    ],
    sources: top.map(({ item }) =>
      sourceOf(item, "支持报告中关于 AI 能力变化、业务流程结合点和试点方向的判断。")
    )
  };
}

function parseReportJson(content: string): DailyReport | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as DailyReport;
    if (
      parsed.title &&
      parsed.executiveSummary &&
      Array.isArray(parsed.relevanceAnalyses) &&
      Array.isArray(parsed.actions) &&
      Array.isArray(parsed.priorities) &&
      Array.isArray(parsed.sources)
    ) {
      return { ...parsed, generatedBy: "deepseek" };
    }
  } catch {
    return null;
  }
  return null;
}

export async function generateDailyReport(
  userId: string,
  profile: UserProfile,
  items: RecommendationForReport[]
) {
  const fallback = fallbackDailyReport(profile, items);
  const keySource = await getDeepSeekKeyForUser(userId);
  if (!keySource) return fallback;

  const prompt = `你是一名“行业研究 + 产品策略 + 商业分析”顾问。请基于筛选出与我的业务高度相关的信息，并写一份可落地的业务分析报告。

请你完成以下任务：

1. 解释相关性
对每条资讯说明：这条资讯讲了什么、为什么重要、和我的业务有什么关系、背后的趋势、可能带来的机会或风险。

2. 结合我的业务做分析
重点分析：可以和我的业务哪个环节结合、解决什么用户痛点、提升什么业务指标、需要哪些数据/产品/技术/运营配合、是否适合当前阶段做。

3. 给出落地建议
输出3-5个具体可执行的业务动作。每个动作包括：动作名称、适用场景、目标用户、解决的问题、产品方案、预期收益、需要验证的关键指标、MVP版本怎么做、可能风险。

4. 给出优先级
用表格形式给出优先级排序，维度包括：业务价值、实现难度、资源要求、风险、推荐优先级、推荐理由。

5. 引用来源
报告中所有关键事实必须标注来源。最后单独列出“参考资讯与来源”，包括资讯标题、发布机构/媒体/公司、发布时间、链接、这条来源支持了报告中的哪个判断。

输出要求：中文；不要写成新闻摘要，要写成业务决策报告；不要空泛，必须结合我的业务；不要只讲趋势，要讲我可以怎么做；如果信息不确定，请明确说明“不确定”或“需要进一步验证”。`;

  try {
    const content = await callDeepSeek(
      keySource.key,
      [
        {
          role: "system",
          content:
            "你必须输出 JSON，不要 Markdown。字段：title、executiveSummary、relevanceAnalyses、businessAnalyses、actions、priorities、sources。"
        },
        {
          role: "user",
          content: JSON.stringify({
            prompt,
            user: {
              type: profile.userType,
              role: profile.role,
              industry: profile.industry,
              aiLevel: profile.aiLevel,
              goals: parseStringArray(profile.goals),
              interestTags: parseStringArray(profile.interestTags)
            },
            selectedNews: items.slice(0, 5).map(({ item }) => ({
              title: item.title,
              summary: item.summary,
              source: item.source,
              publishedAt: item.publishedAt.toISOString(),
              tags: parseStringArray(item.tags),
              url: item.url
            }))
          })
        }
      ],
      { maxTokens: 5000, temperature: 0.35, jsonMode: true }
    );
    return parseReportJson(content) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function getOrCreateDailyReport(
  userId: string,
  date: string,
  profile: UserProfile,
  items: RecommendationForReport[]
) {
  const [archived, userApiKey] = await Promise.all([
    prisma.dailyReportArchive.findUnique({
      where: { userId_date: { userId, date } }
    }),
    prisma.userApiKey.findUnique({ where: { userId } })
  ]);

  if (archived) {
    const savedReport = JSON.parse(archived.report) as DailyReport;
    const shouldRegenerate =
      savedReport.generatedBy === "rule" &&
      userApiKey &&
      userApiKey.updatedAt > archived.generatedAt;

    if (!shouldRegenerate) return savedReport;

    const regenerated = await generateDailyReport(userId, profile, items);
    await prisma.dailyReportArchive.update({
      where: { id: archived.id },
      data: { report: JSON.stringify(regenerated), generatedAt: new Date() }
    });
    return regenerated;
  }
  if (items.length === 0) return null;

  const report = await generateDailyReport(userId, profile, items);
  await prisma.dailyReportArchive.upsert({
    where: { userId_date: { userId, date } },
    update: {},
    create: { userId, date, report: JSON.stringify(report) }
  });
  return report;
}

export async function getDailyReportDates(userId: string) {
  const rows = await prisma.dailyReportArchive.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: "desc" },
    take: 60
  });
  return rows.map((row) => row.date);
}
