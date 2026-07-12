"use client";

import { useEffect, useState } from "react";
import { KeyRound, Trash2, Wifi } from "lucide-react";

type Status = {
  hasUserKey: boolean;
  keyHint: string | null;
  verifiedAt: string | null;
  hasEnvKey: boolean;
};

export function ApiKeyPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [key, setKey] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadStatus() {
    const response = await fetch("/api/settings/api-key", { cache: "no-store" });
    setStatus(await response.json());
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function request(
    method: "POST" | "DELETE",
    body?: unknown,
    options?: { clearInputOnSuccess?: boolean }
  ) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/settings/api-key", {
        method,
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "操作失败");
      setMessage(data.message || "操作成功");
      if (options?.clearInputOnSuccess ?? true) {
        setKey("");
      }
      await loadStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-black/5 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">DeepSeek API Key</h2>
          <p className="mt-1 text-sm text-slate-600">
            用户 Key 优先于服务端环境变量，仅用于你触发的建议和顾问问答。
          </p>
        </div>
        <KeyRound className="h-5 w-5 text-lagoon" />
      </div>

      <div className="mb-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
        {status?.hasUserKey ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              已保存：<span className="font-medium">{status.keyHint}</span>
              {status.verifiedAt ? `，上次测试 ${new Date(status.verifiedAt).toLocaleString("zh-CN")}` : ""}
            </p>
            <button
              disabled={loading}
              onClick={() => request("DELETE")}
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              删除
            </button>
          </div>
        ) : status?.hasEnvKey ? (
          <p>未保存个人 Key，将使用服务端 `DEEPSEEK_API_KEY`。</p>
        ) : (
          <p>未配置 Key，AI 建议会自动使用规则模板兜底。</p>
        )}
      </div>

      <input
        value={key}
        onChange={(event) => setKey(event.target.value)}
        placeholder="sk-..."
        className="focus-ring w-full rounded-md border border-slate-200 px-3 py-3"
        type="password"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={loading || !key.trim()}
          onClick={() => request("POST", { action: "save", key })}
          className="focus-ring rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          保存
        </button>
        <button
          disabled={loading}
          onClick={() =>
            request(
              "POST",
              { action: "test", key: key.trim() || undefined },
              { clearInputOnSuccess: false }
            )
          }
          className="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Wifi className="h-4 w-4" />
          测试连接
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}
