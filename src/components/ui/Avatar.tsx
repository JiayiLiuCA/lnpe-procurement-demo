/** 姓氏圆牌 */
export function Avatar({
  name,
  size = 32,
  tone = "primary",
}: {
  name: string;
  size?: number;
  tone?: "primary" | "soft" | "gray";
}) {
  const cls =
    tone === "primary"
      ? "bg-primary text-white"
      : tone === "soft"
        ? "bg-primary-soft text-primary-hover"
        : "bg-line-soft text-ink-2";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${cls}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {name.slice(0, 1)}
    </span>
  );
}
