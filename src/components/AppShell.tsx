import Link from "next/link";
import { BriefcaseBusiness, Newspaper, Settings, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/actions/auth";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-black/5 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-5">AI热译</p>
              <p className="text-xs text-slate-500">把 AI 热点翻译成你的工作机会</p>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link className="rounded-md px-3 py-2 hover:bg-slate-100" href="/">
              <span className="inline-flex items-center gap-2">
                <Newspaper className="h-4 w-4" />
                首页
              </span>
            </Link>
            <Link className="rounded-md px-3 py-2 hover:bg-slate-100" href="/daily">
              <span className="inline-flex items-center gap-2">
                <BriefcaseBusiness className="h-4 w-4" />
                晨报
              </span>
            </Link>
            <Link className="rounded-md px-3 py-2 hover:bg-slate-100" href="/settings">
              <span className="inline-flex items-center gap-2">
                <Settings className="h-4 w-4" />
                设置
              </span>
            </Link>
            <form action={signOutAction}>
              <button className="rounded-md border border-slate-200 px-3 py-2 hover:bg-white">
                退出
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
