import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { answerAdvisorQuestion } from "@/lib/insights";
import { markNewsAction } from "@/lib/recommendation";

const requestSchema = z.object({
  newsItemId: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000)
      })
    )
    .min(1)
    .max(20)
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user.apiKey) {
      return NextResponse.json(
        { error: "请先在设置页绑定 DeepSeek API Key 后再使用 AI 顾问。" },
        { status: 402 }
      );
    }
    const body = requestSchema.parse(await request.json());
    await markNewsAction(user.id, body.newsItemId, "read");
    const answer = await answerAdvisorQuestion(user.id, body.newsItemId, body.messages);
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "提问失败" },
      { status: 400 }
    );
  }
}
