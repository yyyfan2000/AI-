import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  deleteUserDeepSeekKey,
  saveUserDeepSeekKey,
  testDeepSeekKey
} from "@/lib/deepseek";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), key: z.string().min(20) }),
  z.object({ action: z.literal("test"), key: z.string().min(20).optional() })
]);

export async function GET() {
  const user = await requireUser();
  return NextResponse.json({
    hasUserKey: Boolean(user.apiKey),
    keyHint: user.apiKey?.keyHint ?? null,
    verifiedAt: user.apiKey?.verifiedAt?.toISOString() ?? null,
    hasEnvKey: Boolean(process.env.DEEPSEEK_API_KEY)
  });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = bodySchema.parse(await request.json());

    if (body.action === "save") {
      const keyHint = await saveUserDeepSeekKey(user.id, body.key);
      return NextResponse.json({ message: `已保存 ${keyHint}` });
    }

    await testDeepSeekKey(user.id, body.key);
    return NextResponse.json({ message: "DeepSeek 连接成功" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "操作失败" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const user = await requireUser();
  await deleteUserDeepSeekKey(user.id);
  return NextResponse.json({ message: "已删除个人 DeepSeek API Key" });
}
