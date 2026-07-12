import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "ai-reyi-session";
const SESSION_DAYS = 30;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function digest(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function digestAuthCode(email: string, code: string) {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET || "ai-reyi-local-only-secret";
  return crypto.createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

function sessionExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  return expiresAt;
}

export async function createAuthCode(email: string) {
  const normalized = normalizeEmail(email);
  const recentCodes = await prisma.authCode.count({
    where: {
      email: normalized,
      createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) }
    }
  });
  if (recentCodes >= 3) throw new Error("验证码请求过于频繁，请 10 分钟后再试");

  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const authCode = await prisma.authCode.create({
    data: {
      email: normalized,
      code: digestAuthCode(normalized, code),
      expiresAt
    }
  });

  if (process.env.NODE_ENV === "production") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      await prisma.authCode.delete({ where: { id: authCode.id } });
      throw new Error("邮件服务尚未配置");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: normalized,
        subject: "AI热译登录验证码",
        html: `<p>你的登录验证码是：</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>验证码 10 分钟内有效，请勿转发给他人。</p>`
      })
    });
    if (!response.ok) {
      await prisma.authCode.delete({ where: { id: authCode.id } });
      throw new Error("验证码邮件发送失败");
    }
  } else {
    console.log(`[AI热译] ${normalized} 的开发验证码：${code}`);
  }
}

export async function verifyAuthCode(email: string, code: string) {
  const normalized = normalizeEmail(email);
  const authCode = await prisma.authCode.findFirst({
    where: {
      email: normalized,
      code: digestAuthCode(normalized, code.trim()),
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!authCode) return null;

  await prisma.authCode.update({
    where: { id: authCode.id },
    data: { usedAt: new Date() }
  });

  const user = await prisma.user.upsert({
    where: { email: normalized },
    update: {},
    create: { email: normalized },
    include: { profile: true }
  });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      token: digest(token),
      userId: user.id,
      expiresAt: sessionExpiry()
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: sessionExpiry()
  });

  return user;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token: digest(token) },
    include: { user: { include: { profile: true, apiKey: true } } }
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function signOut() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token: digest(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}
