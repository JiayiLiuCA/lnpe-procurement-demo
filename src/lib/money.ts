// 金额格式化：千分位 + 可选 ¥ 前缀；金额永不手写字符串

export function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

export function fmtMoney(n: number): string {
  return `¥${fmtNum(n)}`;
}

/** 不含税金额（floor 才得开山 6,541,592） */
export function exclTax(incl: number): number {
  return Math.floor(incl / 1.13);
}

export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}
