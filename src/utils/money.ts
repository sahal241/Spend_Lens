import type { Bucket, Settings, Transaction } from "../types";
export const MAX_MONEY = 1_000_000_000_00;
export function parseMoney(value: string): number {
  if (!/^\d+(\.\d{0,2})?$/.test(value)) return NaN;
  const [whole, decimal = ""] = value.split(".");
  const result = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  return Number.isSafeInteger(result) && result <= MAX_MONEY ? result : NaN;
}
export const moneyInput = (paise: number) =>
  (paise / 100).toFixed(2).replace(/\.00$/, "");
export const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);
export function allocate(total: number, weights: number[]): number[] {
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    weights.some((w) => !Number.isSafeInteger(w) || w < 0) ||
    weights.reduce((a, b) => a + b, 0) <= 0
  )
    throw new Error("Invalid allocation");
  const sum = weights.reduce((a, b) => a + BigInt(b), 0n);
  const rows = weights.map((w, i) => ({
    i,
    value: (BigInt(total) * BigInt(w)) / sum,
    remainder: (BigInt(total) * BigInt(w)) % sum,
  }));
  let extra = BigInt(total) - rows.reduce((a, b) => a + b.value, 0n);
  for (const row of [...rows].sort((a, b) =>
    a.remainder === b.remainder
      ? a.i - b.i
      : a.remainder > b.remainder
        ? -1
        : 1,
  )) {
    if (extra > 0n) {
      row.value++;
      extra--;
    }
  }
  return rows.map((r) => Number(r.value));
}
export function splitBudget(
  settings: Pick<
    Settings,
    | "salary"
    | "needsPct"
    | "wantsPct"
    | "savingsPct"
    | "splitMode"
    | "amountWeights"
  >,
): Record<Bucket, number> {
  const weights =
    settings.splitMode === "amount" && settings.amountWeights
      ? settings.amountWeights
      : [settings.needsPct, settings.wantsPct, settings.savingsPct].map((v) =>
          Math.round(v * 100),
        );
  const [needs, wants, savings] = allocate(settings.salary, weights);
  return { needs, wants, savings };
}
export const sumSpent = (
  rows: Transaction[],
  bucket?: Bucket,
  categoryId?: string,
) =>
  rows
    .filter(
      (t) =>
        (!bucket || t.bucket === bucket) &&
        (!categoryId || t.categoryId === categoryId),
    )
    .reduce((sum, t) => sum + t.amount, 0);
export const remaining = (budget: number, spent: number) => budget - spent;
export const usage = (spent: number, budget: number) =>
  budget > 0 ? Math.round((spent / budget) * 100) : spent > 0 ? 100 : 0;
export const status = (spent: number, limit: number) =>
  spent > limit
    ? "danger"
    : spent > 0 && spent >= limit * 0.8
      ? "warning"
      : "normal";
