import type { Category, MonthlyBudget, Settings, Transaction } from "../types";
import { BUCKETS } from "../types";
import { db } from "../db";
import { MAX_MONEY } from "./money";
export interface Backup {
  format: "spendlens";
  version: 1;
  exportedAt: string;
  settings: Settings;
  categories: Category[];
  transactions: Transaction[];
  monthlyBudgets: MonthlyBudget[];
}
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const amount = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= MAX_MONEY;
const text = (v: unknown, max = 200): v is string =>
  typeof v === "string" && v.length <= max;
const bucket = (v: unknown) => BUCKETS.includes(v as (typeof BUCKETS)[number]);
const validDate = (v: unknown) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(`${v}T12:00:00Z`)) &&
  new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v &&
  v >= "2000-01-01" &&
  v <= "9999-12-31";
const month = (v: unknown) =>
  typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const category = (v: unknown): boolean =>
  record(v) &&
  text(v.id, 100) &&
  v.id.length > 0 &&
  bucket(v.bucket) &&
  text(v.name, 50) &&
  v.name.trim().length > 0 &&
  text(v.icon, 60) &&
  amount(v.limit) &&
  typeof v.order === "number" &&
  Number.isSafeInteger(v.order) &&
  v.order >= 0 &&
  (v.archived === undefined || typeof v.archived === "boolean");
const unique = (items: Record<string, unknown>[], key: string) =>
  new Set(items.map((v) => v[key])).size === items.length;
export function validateBackup(value: unknown): Backup {
  const fail = (): never => {
    throw new Error(
      "This is not a valid SpendLens backup. No data was changed.",
    );
  };
  if (
    !record(value) ||
    value.format !== "spendlens" ||
    value.version !== 1 ||
    !record(value.settings)
  )
    return fail();
  const s = value.settings;
  if (
    s.id !== 1 ||
    !amount(s.salary) ||
    s.salary === 0 ||
    !["ratio", "amount"].includes(String(s.splitMode)) ||
    !["system", "light", "dark"].includes(String(s.theme)) ||
    !(
      s.reminderTime === null ||
      (typeof s.reminderTime === "string" &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(s.reminderTime))
    )
  )
    return fail();
  if (
    (s.lastBucket !== undefined && !bucket(s.lastBucket)) ||
    (s.lastCategoryId !== undefined && !text(s.lastCategoryId, 100))
  )
    return fail();
  const pcts = [s.needsPct, s.wantsPct, s.savingsPct];
  if (
    !pcts.every(
      (p) => typeof p === "number" && Number.isFinite(p) && p >= 0 && p <= 100,
    ) ||
    pcts.reduce<number>((sum, p) => sum + Math.round(Number(p) * 100), 0) !==
      10000
  )
    return fail();
  if (
    s.splitMode === "amount" &&
    (!Array.isArray(s.amountWeights) ||
      s.amountWeights.length !== 3 ||
      !s.amountWeights.every(amount) ||
      s.amountWeights.reduce((a, b) => a + b, 0) <= 0)
  )
    return fail();
  for (const key of ["categories", "transactions", "monthlyBudgets"])
    if (!Array.isArray(value[key]) || (value[key] as unknown[]).length > 100000)
      return fail();
  const cats = value.categories as unknown[];
  const tx = value.transactions as unknown[];
  const budgets = value.monthlyBudgets as unknown[];
  if (!cats.every(category) || !unique(cats as Record<string, unknown>[], "id"))
    return fail();
  if (
    !budgets.every(
      (b) =>
        record(b) &&
        month(b.monthKey) &&
        amount(b.salary) &&
        record(b.buckets) &&
        BUCKETS.every((k) =>
          amount((b.buckets as Record<string, unknown>)[k]),
        ) &&
        BUCKETS.reduce(
          (sum, k) => sum + Number((b.buckets as Record<string, unknown>)[k]),
          0,
        ) === b.salary &&
        Array.isArray(b.categories) &&
        b.categories.every(category) &&
        unique(b.categories as Record<string, unknown>[], "id"),
    ) ||
    !unique(budgets as Record<string, unknown>[], "monthKey")
  )
    return fail();
  const allCats = [
    ...cats,
    ...budgets.flatMap((b) => (b as MonthlyBudget).categories),
  ] as Category[];
  if (
    !tx.every(
      (t) =>
        record(t) &&
        text(t.id, 100) &&
        t.id.length > 0 &&
        amount(t.amount) &&
        t.amount > 0 &&
        bucket(t.bucket) &&
        text(t.categoryId, 100) &&
        allCats.some((c) => c.id === t.categoryId && c.bucket === t.bucket) &&
        text(t.note) &&
        validDate(t.date) &&
        typeof t.createdAt === "string" &&
        Number.isFinite(Date.parse(t.createdAt)),
    ) ||
    !unique(tx as Record<string, unknown>[], "id")
  )
    return fail();
  return value as unknown as Backup;
}
export async function makeBackup(): Promise<Backup> {
  const [settings, categories, transactions, monthlyBudgets] =
    await Promise.all([
      db.settings.get(1),
      db.categories.toArray(),
      db.transactions.toArray(),
      db.monthlyBudgets.toArray(),
    ]);
  if (!settings) throw new Error("Set up your budget first.");
  return {
    format: "spendlens",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    categories,
    transactions,
    monthlyBudgets,
  };
}
export async function restoreBackup(backup: Backup) {
  validateBackup(backup);
  await db.transaction(
    "rw",
    [db.settings, db.categories, db.transactions, db.monthlyBudgets],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.categories.clear(),
        db.transactions.clear(),
        db.monthlyBudgets.clear(),
      ]);
      await db.settings.put(backup.settings);
      await db.categories.bulkPut(backup.categories);
      await db.transactions.bulkPut(backup.transactions);
      await db.monthlyBudgets.bulkPut(backup.monthlyBudgets);
    },
  );
}
export function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function toCSV(backup: Backup) {
  const cell = (v: string) =>
    `"${(/^[=+\-@\t\r]/.test(v) ? "'" : "") + v.replace(/"/g, '""')}"`;
  return (
    "\uFEFF" +
    [
      [
        "Date",
        "Amount (INR)",
        "Bucket",
        "Subcategory",
        "Note",
        "Transaction ID",
      ]
        .map(cell)
        .join(","),
      ...backup.transactions.map((t) =>
        [
          t.date,
          (t.amount / 100).toFixed(2),
          t.bucket,
          backup.categories.find((c) => c.id === t.categoryId)?.name ??
            backup.monthlyBudgets
              .flatMap((b) => b.categories)
              .find((c) => c.id === t.categoryId)?.name ??
            "Archived category",
          t.note,
          t.id,
        ]
          .map(cell)
          .join(","),
      ),
    ].join("\r\n")
  );
}
