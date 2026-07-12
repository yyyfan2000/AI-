import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecommendationFeed, type FeedItem } from "@/components/RecommendationFeed";
import { requireUser } from "@/lib/auth";
import { getDailyRecommendations } from "@/lib/recommendation";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  if (!user.profile) redirect("/onboarding");

  const { date: requestedDate } = await searchParams;
  const { date, items, refreshError, isEmpty } = await getDailyRecommendations(user.id, requestedDate);
  const initialItems = JSON.parse(JSON.stringify(items)) as FeedItem[];

  return (
    <AppShell>
      <section className="mb-8">
        <div>
          <p className="text-sm font-medium text-lagoon">每日推荐 · {date}</p>
          <h1 className="mt-2 text-3xl font-semibold">每天 20 条，更贴近你的工作</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>基于画像和轻量记忆重新排序</span>
            <CompactProfile>{user.profile.role}</CompactProfile>
            <CompactProfile>{user.profile.industry}</CompactProfile>
            <CompactProfile>{user.profile.aiLevel}</CompactProfile>
            <Link href="/settings" className="text-lagoon hover:underline">
              调整
            </Link>
          </div>
        </div>
      </section>

      {refreshError ? (
        <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          AI HOT 当前不可用，已使用缓存或样例数据继续展示：{refreshError}
        </div>
      ) : null}

      {isEmpty ? (
        <div className="rounded-md border border-slate-200 bg-white px-5 py-10 text-center text-slate-500">
          该日期还没有推荐归档。每日生成后的 20 条推荐会保留在这里。
        </div>
      ) : null}

      {!isEmpty ? <RecommendationFeed initialDate={date} initialItems={initialItems} /> : null}
    </AppShell>
  );
}

function CompactProfile({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm">
      {children}
    </span>
  );
}
