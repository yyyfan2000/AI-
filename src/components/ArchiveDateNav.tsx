import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { formatArchiveDate } from "@/lib/date";

export function ArchiveDateNav({
  dates,
  selectedDate,
  path
}: {
  dates: string[];
  selectedDate: string;
  path: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarDays className="h-4 w-4 text-slate-500" />
        {dates.slice(0, 8).map((date) => (
          <Link
            key={date}
            href={`${path}?date=${date}`}
            className={
              date === selectedDate
                ? "rounded-md bg-ink px-3 py-2 text-sm text-white"
                : "rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            }
          >
            {formatArchiveDate(date)}
          </Link>
        ))}
      </div>
      <form action={path} className="flex items-center gap-2">
        <input
          type="date"
          name="date"
          defaultValue={selectedDate}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
          查看
        </button>
      </form>
    </div>
  );
}
