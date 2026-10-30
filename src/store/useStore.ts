import { create } from "zustand";
import { db, defaults } from "../db";
import type { Category, MonthlyBudget, Settings, Transaction } from "../types";
import { monthKey, localDate, moveMonth } from "../utils/dates";
import { splitBudget } from "../utils/money";
interface State {
  ready: boolean;
  settings: Settings | null;
  categories: Category[];
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  error: string | null;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  ensureMonth: (key: string) => Promise<void>;
  saveSettings: (s: Settings) => Promise<void>;
  saveCategories: (c: Category[]) => Promise<void>;
  saveTransaction: (t: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  demo: () => Promise<void>;
  reset: () => Promise<void>;
}
export const useStore = create<State>((set, get) => ({
  ready: false,
  settings: null,
  categories: [],
  transactions: [],
  budgets: [],
  error: null,
  refresh: async () => {
    const [settings, categories, transactions, budgets] = await Promise.all([
      db.settings.get(1),
      db.categories.toArray(),
      db.transactions.toArray(),
      db.monthlyBudgets.toArray(),
    ]);
    set({
      settings: settings ?? null,
      categories,
      transactions: transactions.sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.createdAt.localeCompare(a.createdAt),
      ),
      budgets,
      error: null,
    });
  },
  init: async () => {
    try {
      await get().refresh();
      if (get().settings) await get().ensureMonth(monthKey());
      set({ ready: true });
    } catch {
      set({
        ready: true,
        error:
          "Your browser could not open local storage. Allow site storage, then reload.",
      });
    }
  },
  ensureMonth: async (key) => {
    if (await db.monthlyBudgets.get(key)) return;
    const s = await db.settings.get(1);
    if (!s) return;
    const prior = (
      await db.monthlyBudgets.where("monthKey").below(key).sortBy("monthKey")
    ).at(-1);
    const snapshot: MonthlyBudget = {
      carriedFrom: prior?.monthKey,
      reviewed: false,
      monthKey: key,
      salary: prior?.salary ?? s.salary,
      buckets: prior ? { ...prior.buckets } : splitBudget(s),
      categories: prior
        ? structuredClone(prior.categories)
        : await db.categories.toArray(),
    };
    await db.monthlyBudgets.put(snapshot);
    await get().refresh();
  },
  saveSettings: async (s) => {
    const cats = get().categories.length ? get().categories : defaults();
    await db.transaction(
      "rw",
      [db.settings, db.categories, db.monthlyBudgets],
      async () => {
        await db.settings.put(s);
        await db.categories.bulkPut(cats);
        const current = await db.monthlyBudgets.get(monthKey());
        await db.monthlyBudgets.put({
          reviewed: true,
          monthKey: monthKey(),
          salary: s.salary,
          buckets: splitBudget(s),
          categories: current?.categories ?? cats,
        });
      },
    );
    await get().refresh();
  },
  saveCategories: async (cats) => {
    await db.transaction("rw", [db.categories, db.monthlyBudgets], async () => {
      await db.categories.bulkPut(cats);
      await db.monthlyBudgets.update(monthKey(), { categories: cats });
    });
    await get().refresh();
  },
  saveTransaction: async (t) => {
    await get().ensureMonth(t.date.slice(0, 7));
    await db.transaction("rw", [db.transactions, db.settings], async () => {
      await db.transactions.put(t);
      await db.settings.update(1, {
        lastBucket: t.bucket,
        lastCategoryId: t.categoryId,
      });
    });
    await get().refresh();
  },
  deleteTransaction: async (id) => {
    await db.transactions.delete(id);
    await get().refresh();
  },
  reset: async () => {
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
      },
    );
    await get().refresh();
  },
  demo: async () => {
    const s = get().settings;
    if (!s) return;
    const cats = defaults();
    const limits = [
      18000, 7000, 2500, 1000, 2000, 2500, 1500, 500, 4000, 3500, 2000, 500,
      1000, 1000, 8000, 4000, 2000, 500, 500,
    ];
    cats.forEach((c, i) => (c.limit = limits[i] * 100));
    const settings = {
      ...s,
      salary: 7000000,
      needsPct: 50,
      wantsPct: 30,
      savingsPct: 20,
      splitMode: "ratio" as const,
      amountWeights: undefined,
    };
    const current = monthKey();
    const previous = moveMonth(current, -1);
    const tx: Transaction[] = [];
    const add = (name: string, rupees: number, date: string, note: string) => {
      const c = cats.find((c) => c.name === name)!;
      tx.push({
        id: crypto.randomUUID(),
        amount: Math.round(rupees * 100),
        bucket: c.bucket,
        categoryId: c.id,
        note,
        date,
        createdAt: new Date(`${date}T12:00:00`).toISOString(),
      });
    };
    for (const key of [previous, current]) {
      const today = Number(localDate().slice(8));
      const maxDay = key === current ? today : 28;
      for (const [name, amt, day, note] of [
        ["Rent", 18000, 1, "A place to call home"],
        ["SIP/Mutual Funds", 8000, 2, "Monthly SIP"],
        ["Food", 1860, 4, "Weekly groceries"],
        ["Travel", 450, 6, "Metro recharge"],
        ["Dining Out", 1240, 9, "Dinner with friends"],
        ["Shopping", 2199, 12, "A little wardrobe refresh"],
        ["Bills and Utilities", 1150, 14, "Electricity bill"],
        ["Food", 1480, 17, "Fresh market run"],
        ["Emergency Fund", 2000, 19, "Future me says thanks"],
        ["Entertainment", 649, 21, "Movie night"],
        ["Food", 1380, 23, "Groceries"],
        ["Dining Out", 980, 25, "Weekend brunch"],
        ["Health", 380, 26, "Pharmacy"],
      ] as [string, number, number, string][]) {
        if (day <= maxDay)
          add(name, amt, `${key}-${String(day).padStart(2, "0")}`, note);
      }
    }
    add("Food", 240, localDate(), "Morning coffee & a sandwich");
    add("Travel", 80, localDate(), "Ride to work");
    add("Dining Out", 320, localDate(), "Lunch at the little café");
    await db.transaction(
      "rw",
      [db.settings, db.categories, db.transactions, db.monthlyBudgets],
      async () => {
        await db.settings.put(settings);
        await db.categories.clear();
        await db.categories.bulkPut(cats);
        await db.transactions.clear();
        await db.transactions.bulkPut(tx);
        await db.monthlyBudgets.clear();
        await db.monthlyBudgets.bulkPut(
          [previous, current].map((key) => ({
            monthKey: key,
            salary: settings.salary,
            buckets: splitBudget(settings),
            categories: cats,
          })),
        );
      },
    );
    await get().refresh();
  },
}));
