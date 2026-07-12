import "server-only";

import { decryptText, encryptText, maskApiKey } from "@/lib/crypto";
import { prisma } from "@/lib/db";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function isLikelyDeepSeekKey(key: string) {
  const trimmed = key.trim();
  return trimmed.startsWith("sk-") && trimmed.length >= 20;
}

export async function saveUserDeepSeekKey(userId: string, key: string) {
  const trimmed = key.trim();
  if (!isLikelyDeepSeekKey(trimmed)) {
    throw new Error("DeepSeek API Key 格式看起来不正确");
  }

  const encrypted = encryptText(trimmed);
  const keyHint = maskApiKey(trimmed);

  await prisma.userApiKey.upsert({
    where: { userId },
    update: {
      provider: "deepseek",
      keyCipher: encrypted.keyCipher,
      keyIv: encrypted.keyIv,
      keyTag: encrypted.keyTag,
      keyHint,
      verifiedAt: null
    },
    create: {
      userId,
      provider: "deepseek",
      keyCipher: encrypted.keyCipher,
      keyIv: encrypted.keyIv,
      keyTag: encrypted.keyTag,
      keyHint
    }
  });

  return keyHint;
}

export async function deleteUserDeepSeekKey(userId: string) {
  await prisma.userApiKey.deleteMany({
    where: { userId, provider: "deepseek" }
  });
}

export async function getDeepSeekKeyForUser(userId: string) {
  const userKey = await prisma.userApiKey.findUnique({ where: { userId } });
  if (userKey) {
    return {
      key: decryptText(userKey),
      source: "user" as const,
      keyHint: userKey.keyHint
    };
  }

  const envKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (envKey) {
    return {
      key: envKey,
      source: "env" as const,
      keyHint: maskApiKey(envKey)
    };
  }

  return null;
}

export async function callDeepSeek(
  apiKey: string,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
) {
  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
      messages,
      temperature: options?.temperature ?? 0.4,
      max_tokens: options?.maxTokens ?? 900,
      ...(options?.jsonMode ? { response_format: { type: "json_object" } } : {})
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`DeepSeek 请求失败：${response.status} ${body.slice(0, 120)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("DeepSeek 没有返回内容");
  return content;
}

export async function testDeepSeekKey(userId: string, inputKey?: string) {
  const keySource = inputKey?.trim()
    ? { key: inputKey.trim(), source: "input" as const }
    : await getDeepSeekKeyForUser(userId);

  if (!keySource) throw new Error("没有可测试的 DeepSeek API Key");
  if (!isLikelyDeepSeekKey(keySource.key)) throw new Error("DeepSeek API Key 格式看起来不正确");

  await callDeepSeek(
    keySource.key,
    [
      {
        role: "system",
        content: "你只需要用一句简短中文回答连接成功。"
      },
      { role: "user", content: "请回复：连接成功" }
    ],
    { maxTokens: 30, temperature: 0 }
  );

  if (keySource.source !== "input") {
    await prisma.userApiKey.updateMany({
      where: { userId, provider: "deepseek" },
      data: { verifiedAt: new Date() }
    });
  }

  return true;
}
