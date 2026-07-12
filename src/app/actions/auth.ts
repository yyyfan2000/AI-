"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAuthCode, signOut, verifyAuthCode } from "@/lib/auth";

const emailSchema = z.string().email("请输入正确邮箱");

export async function requestCodeAction(formData: FormData) {
  const email = emailSchema.parse(formData.get("email"));
  try {
    await createAuthCode(email);
  } catch {
    redirect(`/login?error=send&email=${encodeURIComponent(email)}`);
  }
  redirect(`/login?sent=${encodeURIComponent(email)}`);
}

export async function verifyCodeAction(formData: FormData) {
  const email = emailSchema.parse(formData.get("email"));
  const code = z.string().min(4).parse(formData.get("code"));
  const user = await verifyAuthCode(email, code);
  if (!user) redirect(`/login?sent=${encodeURIComponent(email)}&error=code`);
  redirect(user.profile ? "/" : "/onboarding");
}

export async function signOutAction() {
  await signOut();
  redirect("/login");
}
