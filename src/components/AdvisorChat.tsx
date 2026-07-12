"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { KeyRound, Send } from "lucide-react";
import { clsx } from "clsx";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function AdvisorChat({
  hasApiKey,
  newsItemId
}: {
  hasApiKey: boolean;
  newsItemId: string;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "你可以直接问：这条资讯适合我做什么业务实验？它会影响哪个产品环节？怎么做 MVP？"
    }
  ]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  async function ask() {
    const question = input.trim();
    if (!question || loading || !hasApiKey) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          newsItemId,
          messages: nextMessages
            .filter((message) => message.role === "user" || message.role === "assistant")
            .slice(-12)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "提问失败");
      setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "提问失败"
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex h-[620px] min-h-[520px] flex-col overflow-hidden rounded-lg border border-black/5 bg-white shadow-soft">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-semibold">AI 顾问</h2>
        <p className="mt-1 text-sm text-slate-600">
          多轮追问它如何进入你的岗位、行业、产品或流程。
        </p>
      </div>

      {!hasApiKey ? (
        <div className="m-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">绑定 DeepSeek API Key 后才能使用 AI 顾问</p>
              <p className="mt-1">
                当前页面仍会保留资讯分析，但多轮对话需要你在设置中配置个人 Key。
              </p>
              <Link
                href="/settings"
                className="mt-3 inline-block rounded-md bg-ink px-3 py-2 text-white"
              >
                去设置绑定
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={clsx(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={clsx(
                "max-w-[86%] rounded-lg px-4 py-3 text-sm leading-7",
                message.role === "user"
                  ? "bg-ink text-white"
                  : "border border-slate-100 bg-white text-slate-700"
              )}
            >
              {message.content}
            </div>
          </div>
        ))}
        {loading ? (
          <div className="flex justify-start">
            <div className="rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500">
              正在分析...
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-100 bg-white p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void ask();
              }
            }}
            disabled={!hasApiKey}
            placeholder={
              hasApiKey
                ? "输入你的追问，Enter 发送，Shift+Enter 换行"
                : "请先在设置页绑定 DeepSeek API Key"
            }
            className="focus-ring min-h-12 flex-1 resize-none rounded-md border border-slate-200 px-3 py-3 disabled:bg-slate-100"
          />
          <button
            onClick={ask}
            disabled={loading || !input.trim() || !hasApiKey}
            className="focus-ring inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-ink text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="发送"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          AI 顾问会结合当前资讯与用户画像回答，关键事实仍建议回到原文核验。
        </p>
      </div>
    </section>
  );
}
