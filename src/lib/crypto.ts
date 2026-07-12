import crypto from "crypto";

function getKey() {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("生产环境缺少 API_KEY_ENCRYPTION_SECRET");
  }
  return crypto.createHash("sha256").update(secret || "ai-reyi-local-only-secret").digest();
}

export function encryptText(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return {
    keyCipher: encrypted.toString("base64"),
    keyIv: iv.toString("base64"),
    keyTag: tag.toString("base64")
  };
}

export function decryptText(input: {
  keyCipher: string;
  keyIv: string;
  keyTag: string;
}) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(input.keyIv, "base64")
  );
  decipher.setAuthTag(Buffer.from(input.keyTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(input.keyCipher, "base64")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

export function maskApiKey(key: string) {
  const trimmed = key.trim();
  if (trimmed.length <= 10) return "已保存";
  return `${trimmed.slice(0, 3)}-...${trimmed.slice(-4)}`;
}
