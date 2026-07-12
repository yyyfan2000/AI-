import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDailyRecommendations, getRecommendationDates } from "@/lib/recommendation";

export async function GET(request: Request) {
  const user = await requireUser();
  const before = new URL(request.url).searchParams.get("before") ?? "9999-12-31";
  const dates = await getRecommendationDates(user.id);
  const date = dates.find((candidate) => candidate < before);
  if (!date) return NextResponse.json({ date: null, items: [] });

  const result = await getDailyRecommendations(user.id, date);
  return NextResponse.json({ date, items: result.items });
}
