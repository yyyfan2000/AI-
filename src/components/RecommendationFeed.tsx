"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, Lightbulb, LoaderCircle, ThumbsDown } from "lucide-react";
import { clsx } from "clsx";
import { newsAction, openAdvisorAction, toggleSavedAction } from "@/app/actions/news";
import { ReadTracker } from "@/components/ReadTracker";
import { StatusPill } from "@/components/StatusPill";
import { parseStringArray } from "@/lib/json";

export type FeedItem = {
  item: {
    id: string;
    title: string;
    summary: string;
    source: string;
    publishedAt: string;
    heatScore: number;
    tags: string;
    url: string;
    relevanceScore: number;
  };
  insight: {
    recommendReason: string;
    workInsight: string;
    suggestedActions: string;
  };
  actions: string[];
};

type FeedGroup = { date: string; items: FeedItem[] };

export function RecommendationFeed({ initialDate, initialItems }: { initialDate: string; initialItems: FeedItem[] }) {
  const [groups, setGroups] = useState<FeedGroup[]>([{ date: initialDate, items: initialItems }]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const triggerRef = useRef<HTMLDivElement>(null);
  const oldestDate = groups.at(-1)?.date ?? initialDate;

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setLoading(true);
        void fetch(`/api/recommendations/history?before=${oldestDate}`)
          .then((response) => response.json())
          .then((data: { date: string | null; items: FeedItem[] }) => {
            if (!data.date) {
              setHasMore(false);
              return;
            }
            setGroups((current) => [...current, { date: data.date!, items: data.items }]);
          })
          .catch(() => setHasMore(false))
          .finally(() => setLoading(false));
      },
      { rootMargin: "500px 0px" }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [hasMore, loading, oldestDate]);

  return (
    <div className="grid gap-8">
      {groups.map((group, groupIndex) => (
        <section key={group.date}>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-500">{group.date}</h2>
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">{group.items.length} 条推荐</span>
          </div>
          <div className="grid gap-5">
            {group.items.map((entry) => <RecommendationCard key={`${group.date}-${entry.item.id}`} entry={entry} />)}
          </div>
          {groupIndex < groups.length - 1 ? <div className="mt-8 h-px bg-slate-100" /> : null}
        </section>
      ))}
      <div ref={triggerRef} className="flex min-h-20 items-center justify-center text-sm text-slate-400">
        {loading ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />正在加载更早推荐</> : null}
        {!loading && !hasMore ? "已经看完全部历史推荐" : null}
      </div>
    </div>
  );
}

function RecommendationCard({ entry }: { entry: FeedItem }) {
  const { item, insight, actions } = entry;
  const isRead = actions.includes("read");
  const isSaved = actions.includes("saved");

  return (
    <article className={clsx("relative rounded-lg border border-black/5 bg-white p-5 shadow-soft transition", isRead && "bg-slate-50 opacity-70")}>
      <ReadTracker alreadyRead={isRead} newsItemId={item.id} />
      <Link href={`/advisor/${item.id}`} className="block rounded-md focus:outline-none focus:ring-2 focus:ring-lagoon focus:ring-offset-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusPill tone="good">相关性 {item.relevanceScore}</StatusPill>
              <StatusPill>{item.source}</StatusPill>
              {isSaved ? <StatusPill tone="good">已收藏</StatusPill> : null}
              {isRead ? <StatusPill>已读</StatusPill> : null}
            </div>
            <h3 className="text-xl font-semibold leading-snug hover:text-lagoon">{item.title}</h3>
            <p className="mt-3 leading-7 text-slate-600">{item.summary}</p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>热度 {Math.round(item.heatScore)}</p>
            <p>{new Date(item.publishedAt).toLocaleDateString("zh-CN")}</p>
          </div>
        </div>
      </Link>
      <div className="mt-4 flex flex-wrap gap-2">
        {parseStringArray(item.tags).map((tag) => <span key={tag} className="rounded-full bg-mist px-2.5 py-1 text-xs text-slate-600">{tag}</span>)}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <InfoBox title="为什么推荐">{insight.recommendReason}</InfoBox>
        <InfoBox title="工作启发">{insight.workInsight}</InfoBox>
        <div className="rounded-md bg-slate-50 p-4">
          <p className="mb-2 text-sm font-semibold">今天可尝试</p>
          <ul className="space-y-2 text-sm leading-6 text-slate-700">
            {parseStringArray(insight.suggestedActions).map((action) => <li key={action}>{action}</li>)}
          </ul>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <form action={toggleSavedAction}>
          <input type="hidden" name="newsItemId" value={item.id} />
          <button className={clsx("focus-ring inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm", isSaved ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-200 hover:bg-slate-50")}>
            <Bookmark className="h-4 w-4" />{isSaved ? "取消收藏" : "收藏"}
          </button>
        </form>
        <form action={newsAction}>
          <input type="hidden" name="newsItemId" value={item.id} />
          <input type="hidden" name="type" value="hidden" />
          <button className="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"><ThumbsDown className="h-4 w-4" />不感兴趣</button>
        </form>
        <form action={openAdvisorAction}>
          <input type="hidden" name="newsItemId" value={item.id} />
          <button className="focus-ring inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"><Lightbulb className="h-4 w-4" />深挖灵感</button>
        </form>
        <a href={item.url} target="_blank" rel="noreferrer" className="rounded-md px-3 py-2 text-sm text-lagoon hover:bg-teal-50">原文</a>
      </div>
    </article>
  );
}

function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-md bg-slate-50 p-4"><p className="mb-2 text-sm font-semibold">{title}</p><p className="text-sm leading-6 text-slate-700">{children}</p></div>;
}
