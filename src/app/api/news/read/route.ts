import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { markNewsAction } from "@/lib/recommendation";

const requestSchema = z.object({
  newsItemId: z.string().min(1)
});

export async function POST(request: Request) {
  const user = await requireUser();
  const { newsItemId } = requestSchema.parse(await request.json());
  await markNewsAction(user.id, newsItemId, "read");
  return NextResponse.json({ ok: true });
}
