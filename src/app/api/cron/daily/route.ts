import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateDailyReport } from "@/lib/daily-report";
import { getDailyRecommendations } from "@/lib/recommendation";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { profile: { isNot: null } },
    include: { profile: true }
  });
  const results: Array<{ userId: string; ok: boolean }> = [];

  for (let index = 0; index < users.length; index += 5) {
    const batch = users.slice(index, index + 5);
    const batchResults = await Promise.all(
      batch.map(async (user) => {
        try {
          if (!user.profile) return { userId: user.id, ok: false };
          const recommendations = await getDailyRecommendations(user.id);
          await getOrCreateDailyReport(
            user.id,
            recommendations.date,
            user.profile,
            recommendations.items.slice(0, 5)
          );
          return { userId: user.id, ok: true };
        } catch (error) {
          console.error("Daily cron failed", {
            userId: user.id,
            error: error instanceof Error ? error.message : "unknown"
          });
          return { userId: user.id, ok: false };
        }
      })
    );
    results.push(...batchResults);
  }

  return NextResponse.json({ processed: results.length, succeeded: results.filter((result) => result.ok).length });
}
