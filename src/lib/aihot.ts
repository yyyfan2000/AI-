import "server-only";

import { prisma } from "@/lib/db";

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" ? (value as AnyRecord) : {};
}

function readString(record: AnyRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return fallback;
}

function readNumber(record: AnyRecord, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return fallback;
}

function readTags(record: AnyRecord) {
  const raw =
    record.tags ?? record.labels ?? record.categories ?? record.keywords ?? [];
  if (Array.isArray(raw)) {
    return raw
      .map((tag) => (typeof tag === "string" ? tag : readString(asRecord(tag), ["name", "label", "title"])))
      .filter(Boolean)
      .slice(0, 8);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,，/#\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  return [];
}

function readDate(record: AnyRecord) {
  const raw = readString(record, [
    "publishedAt",
    "published_at",
    "createdAt",
    "created_at",
    "date",
    "time"
  ]);
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function extractItems(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload.map(asRecord);
  const record = asRecord(payload);
  const candidates = [record.items, record.data, record.list, record.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.map(asRecord);
    const nested = asRecord(candidate);
    if (Array.isArray(nested.items)) return nested.items.map(asRecord);
    if (Array.isArray(nested.list)) return nested.list.map(asRecord);
  }
  return [];
}

function normalizeItem(item: AnyRecord, index: number) {
  const title = readString(item, ["title", "name", "headline"], "未命名资讯");
  const summary = readString(
    item,
    ["summary", "description", "desc", "abstract", "content"],
    "这条资讯暂时没有摘要，建议打开原文了解详情。"
  );
  const url = readString(item, ["url", "link", "sourceUrl", "source_url"], "https://aihot.virxact.com/all");
  const externalId =
    readString(item, ["id", "itemId", "item_id", "uuid", "slug"]) ||
    `${url}-${title}-${index}`;

  return {
    externalId,
    title,
    summary,
    source: readString(item, ["source", "site", "from", "publisher"], "AI HOT"),
    publishedAt: readDate(item),
    heatScore: readNumber(item, ["heatScore", "hotScore", "score", "heat", "weight"], 0),
    tags: readTags(item),
    url,
    raw: item
  };
}

type NormalizedAihotItem = {
  externalId: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: Date;
  heatScore: number;
  tags: string[];
  url: string;
  raw: AnyRecord;
};

const fallbackItems: NormalizedAihotItem[] = [
  {
    externalId: "fallback-agent-workflow",
    title: "智能体工作流正在从演示走向真实业务",
    summary: "越来越多产品把智能体用于检索、分析、写作和客服流程，关键价值从炫技转向缩短业务闭环。",
    source: "AI热译样例",
    publishedAt: new Date(),
    heatScore: 72,
    tags: ["智能体", "产品", "企业服务", "提效"],
    url: "https://aihot.virxact.com/all",
    raw: { fallback: true }
  },
  {
    externalId: "fallback-multimodal-product",
    title: "多模态能力开始改变内容生产和知识管理",
    summary: "图像、语音、视频和文档理解能力结合后，内容团队与知识型岗位能把大量非结构化材料转为可复用资产。",
    source: "AI热译样例",
    publishedAt: new Date(Date.now() - 3600 * 1000),
    heatScore: 65,
    tags: ["多模态", "内容", "产品", "办公协同"],
    url: "https://aihot.virxact.com/all",
    raw: { fallback: true }
  },
  {
    externalId: "fallback-open-source-models",
    title: "开源模型生态让行业应用试错成本继续下降",
    summary: "更多团队开始用开源模型做私有化知识库、客服和内部工具，适合对数据安全敏感的行业先做小范围试点。",
    source: "AI热译样例",
    publishedAt: new Date(Date.now() - 2 * 3600 * 1000),
    heatScore: 58,
    tags: ["开源", "模型", "行业", "技术学习"],
    url: "https://aihot.virxact.com/all",
    raw: { fallback: true }
  }
];

export async function refreshAihotItems() {
  const url =
    process.env.AIHOT_ITEMS_URL ||
    "https://aihot.virxact.com/api/public/items?mode=selected&take=50";

  let normalized: NormalizedAihotItem[] = fallbackItems;
  let error: string | null = null;

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 * 15 },
      headers: {
        accept: "application/json",
        "user-agent": "AIReyiMVP/0.1"
      }
    });
    if (!response.ok) throw new Error(`AI HOT 返回 ${response.status}`);
    const payload = await response.json();
    const items = extractItems(payload).map(normalizeItem);
    if (items.length > 0) normalized = items;
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "AI HOT 接口暂不可用";
  }

  for (const item of normalized) {
    await prisma.newsItem.upsert({
      where: { externalId: item.externalId },
      update: {
        title: item.title,
        summary: item.summary,
        source: item.source,
        publishedAt: item.publishedAt,
        heatScore: item.heatScore,
        tags: JSON.stringify(item.tags),
        url: item.url,
        raw: JSON.stringify(item.raw),
        lastFetchedAt: new Date()
      },
      create: {
        ...item,
        tags: JSON.stringify(item.tags),
        raw: JSON.stringify(item.raw)
      }
    });
  }

  return { count: normalized.length, error };
}
