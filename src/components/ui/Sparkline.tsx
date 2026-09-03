// 迷你折线：实线为历史，forecastFrom 之后的点用虚线（预测段），末点打点
export function Sparkline({
  values,
  forecastFrom,
  width = 96,
  height = 28,
  stroke = "#0E7C86",
  forecastStroke = "#7C6BC9",
  className = "",
}: {
  values: number[];
  /** 从该下标起为预测段（含该点作为连接点） */
  forecastFrom?: number;
  width?: number;
  height?: number;
  stroke?: string;
  forecastStroke?: string;
  className?: string;
}) {
  if (values.length === 0) return null;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.abs(max) * 0.05 || 1;
  const x = (i: number) => (values.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (values.length - 1));
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const split = forecastFrom != null && forecastFrom > 0 && forecastFrom < values.length ? forecastFrom : values.length;
  const solid = pts.slice(0, split);
  const dashed = pts.slice(Math.max(split - 1, 0));
  const last = values.length - 1;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      {solid.length > 1 && <polyline points={solid.join(" ")} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />}
      {split < values.length && dashed.length > 1 && (
        <polyline points={dashed.join(" ")} fill="none" stroke={forecastStroke} strokeWidth={1.6} strokeDasharray="3 2.5" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {values.length === 1 && <line x1={pad} x2={width - pad} y1={y(values[0])} y2={y(values[0])} stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />}
      <circle cx={x(last)} cy={y(values[last])} r={2.2} fill={split < values.length ? forecastStroke : stroke} />
    </svg>
  );
}
