"use client";

import Link from "next/link";
import { useState } from "react";
import { clsx } from "clsx";

type MemoryItem = {
  id: string;
  title: string;
  date: string;
  href: string;
};

type TabKey = "saved" | "read" | "hidden";

const labels: Record<TabKey, string> = {
  saved: "收藏",
  read: "已读",
  hidden: "不感兴趣"
};

export function MemoryTabs({
  saved,
  read,
  hidden
}: {
  saved: MemoryItem[];
  read: MemoryItem[];
  hidden: MemoryItem[];
}) {
  const [active, setActive] = useState<TabKey>("saved");
  const groups = { saved, read, hidden };
  const activeItems = groups[active];

  return (
    <section className="rounded-lg border border-black/5 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold">轻量记忆</h2>
      <div className="mt-4 flex rounded-md bg-slate-100 p-1 text-sm">
        {(Object.keys(groups) as TabKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={clsx(
              "focus-ring flex-1 rounded-md px-3 py-2 font-medium transition",
              active === key ? "bg-white text-lagoon shadow-sm" : "text-slate-600 hover:text-ink"
            )}
          >
            {labels[key]} {groups[key].length}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {activeItems.length ? (
          activeItems.slice(0, 10).map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="block rounded-md bg-slate-50 p-3 text-sm hover:bg-slate-100"
            >
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-slate-500">
                {labels[active]} · {item.date}
              </p>
            </Link>
          ))
        ) : (
          <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">
            暂无{labels[active]}资讯
          </div>
        )}
      </div>
    </section>
  );
}
