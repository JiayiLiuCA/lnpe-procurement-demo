// 日期一律 'YYYY-MM-DD' 字符串 + UTC 天级运算，渲染路径禁止 new Date()/Date.now()

export const TODAY = "2026-08-20";

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtc(d: string): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

/** dueAt - TODAY 的天数（>0 表示未来） */
export function daysUntil(dueAt: string, from: string = TODAY): number {
  return Math.round((toUtc(dueAt) - toUtc(from)) / DAY_MS);
}

/** TODAY - past 的天数（>0 表示已逾期） */
export function overdueDays(past: string, from: string = TODAY): number {
  return Math.round((toUtc(from) - toUtc(past)) / DAY_MS);
}

export function addDays(d: string, days: number): string {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

export function addMonths(d: string, months: number): string {
  const [y, m, day] = d.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const nd = Math.min(day, lastDay);
  return `${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}

/** '2026-05-30' → '05-30'；mode 'full' 保留全形 */
export function fmtDate(d: string | undefined, mode: "short" | "full" = "short"): string {
  if (!d) return "—";
  return mode === "full" ? d : d.slice(5);
}
