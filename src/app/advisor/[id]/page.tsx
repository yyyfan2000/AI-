import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AdvisorChat } from "@/components/AdvisorChat";
import { StatusPill } from "@/components/StatusPill";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateInsight } from "@/lib/insights";
import { parseStringArray } from "@/lib/json";
import { getOriginalText } from "@/lib/news-content";
import { markNewsAction } from "@/lib/recommendation";

export default async function AdvisorPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!user.profile) redirect("/onboarding");

  const { id } = await params;
  const item = await prisma.newsItem.findUnique({ where: { id } });
  if (!item) notFound();

  await markNewsAction(user.id, item.id, "read");
  const insight = await getOrCreateInsight(user.id, item);
  const original = await getOriginalText(item);

  return (
    <AppShell>
      <div className="mb-5">
        <Link href="/" className="text-sm text-lagoon hover:underline">
          返回首页
        </Link>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <article className="rounded-lg border border-black/5 bg-white px-7 py-8 shadow-soft">
          <header>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-ink">
              {item.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>{item.publishedAt.toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" })}</span>
              <span>·</span>
              <span>{item.source}</span>
              <span>·</span>
              <span>热度 {Math.round(item.heatScore)}</span>
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-lagoon hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              阅读原文
            </a>
          </header>

          <section className="mt-6 rounded-lg border border-amber-100 bg-amber-50/45 p-5">
            <p className="text-sm font-semibold text-amber-700">精选理由</p>
            <p className="mt-3 text-lg leading-8 text-slate-700">{insight.recommendReason}</p>
          </section>

          <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-lagoon">AI 摘要</p>
            <p className="mt-3 text-lg leading-9 text-slate-700">{item.summary}</p>
          </section>

          <section className="mt-8">
            <h2 className="border-b border-slate-200 pb-3 text-base font-semibold text-slate-500">
              原文
            </h2>
            {!original.isFullText ? (
              <p className="mt-3 text-sm text-slate-500">
                当前数据源未提供完整原文，以下展示可用摘要；完整内容请点击上方「阅读原文」。
              </p>
            ) : null}
            <div className="mt-5 whitespace-pre-line text-xl leading-10 text-slate-700">
              {original.text}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="border-b border-slate-200 pb-3 text-base font-semibold text-slate-500">
              业务结合
            </h2>
            <p className="mt-5 text-xl leading-10 text-slate-700">{insight.workInsight}</p>
            <div className="mt-5 grid gap-3">
              {parseStringArray(insight.suggestedActions).map((action, index) => (
                <div key={action} className="rounded-lg border border-slate-100 bg-white p-4">
                  <p className="text-xs font-medium text-slate-400">动作 {index + 1}</p>
                  <p className="mt-2 leading-7 text-slate-700">{action}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="border-b border-slate-200 pb-3 text-base font-semibold text-slate-500">
              来源信息
            </h2>
            <div className="mt-5 flex flex-wrap gap-2">
              <StatusPill>{item.source}</StatusPill>
              <StatusPill>{item.publishedAt.toLocaleDateString("zh-CN")}</StatusPill>
              {parseStringArray(item.tags).map((tag) => (
                <span key={tag} className="rounded-full bg-mist px-2.5 py-1 text-xs text-slate-600">
                  {tag}
                </span>
              ))}
            </div>
          </section>
        </article>
        <AdvisorChat hasApiKey={Boolean(user.apiKey)} newsItemId={item.id} />
      </div>
    </AppShell>
  );
}
