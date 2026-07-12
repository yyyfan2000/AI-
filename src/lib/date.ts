const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function todayInShanghai() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function normalizeArchiveDate(value?: string) {
  return value && DATE_PATTERN.test(value) ? value : todayInShanghai();
}

export function formatArchiveDate(value: string) {
  return new Date(`${value}T00:00:00+08:00`).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short"
  });
}
