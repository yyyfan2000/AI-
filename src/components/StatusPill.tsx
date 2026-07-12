import { clsx } from "clsx";

export function StatusPill({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "neutral" && "bg-slate-100 text-slate-700",
        tone === "good" && "bg-emerald-50 text-emerald-700",
        tone === "warn" && "bg-amber-50 text-amber-700"
      )}
    >
      {children}
    </span>
  );
}
