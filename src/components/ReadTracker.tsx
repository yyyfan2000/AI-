"use client";

import { useEffect, useRef } from "react";

export function ReadTracker({
  newsItemId,
  alreadyRead
}: {
  newsItemId: string;
  alreadyRead: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (alreadyRead || !ref.current) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let sent = false;

    const markRead = () => {
      if (sent) return;
      sent = true;
      void fetch("/api/news/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newsItemId })
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          timer = setTimeout(markRead, 2800);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.65 }
    );

    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [alreadyRead, newsItemId]);

  return <div ref={ref} className="pointer-events-none absolute inset-0" aria-hidden="true" />;
}
