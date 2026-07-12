"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { markNewsAction, toggleNewsAction } from "@/lib/recommendation";

const actionSchema = z.object({
  newsItemId: z.string().min(1),
  type: z.enum(["saved", "read", "hidden"])
});

export async function newsAction(formData: FormData) {
  const user = await requireUser();
  const parsed = actionSchema.parse({
    newsItemId: formData.get("newsItemId"),
    type: formData.get("type")
  });

  await markNewsAction(user.id, parsed.newsItemId, parsed.type);
  revalidatePath("/");
  revalidatePath("/settings");
}

export async function toggleSavedAction(formData: FormData) {
  const user = await requireUser();
  const newsItemId = z.string().min(1).parse(formData.get("newsItemId"));
  await toggleNewsAction(user.id, newsItemId, "saved");
  revalidatePath("/");
  revalidatePath("/settings");
}

export async function openAdvisorAction(formData: FormData) {
  const user = await requireUser();
  const newsItemId = z.string().min(1).parse(formData.get("newsItemId"));
  await markNewsAction(user.id, newsItemId, "read");
  redirect(`/advisor/${newsItemId}`);
}
