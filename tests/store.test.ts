import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db, defaults } from "../src/db";
import { useStore } from "../src/store/useStore";
import { monthKey, mondayKey, moveMonth } from "../src/utils/dates";
import { makeBackup, restoreBackup, validateBackup } from "../src/utils/backup";
const settings = {
  id: 1,
  salary: 5000000,
  splitMode: "ratio" as const,
  needsPct: 50,
  wantsPct: 30,
  savingsPct: 20,
  theme: "system" as const,
  reminderTime: null,
};
beforeEach(async () => {
  await useStore.getState().reset();
});
describe("monthly snapshots and persistence", () => {
  it("opens a fresh installation without settings, budgets or demo expenses", async () => {
    await useStore.getState().init();
    expect(useStore.getState()).toMatchObject({
      ready: true,
      settings: null,
      categories: [],
      transactions: [],
      budgets: [],
    });
  });
  it("saves the user's setup amounts without creating expenses and preserves them on reload", async () => {
    const categories = defaults().map((category, index) => ({
      ...category,
      limit: index === 0 ? 1234567 : 0,
    }));
    await useStore.getState().saveSettings(settings, categories);
    await useStore.getState().init();
    expect(useStore.getState().settings?.salary).toBe(settings.salary);
    expect(useStore.getState().categories).toEqual(
      expect.arrayContaining(categories),
    );
    expect(useStore.getState().transactions).toEqual([]);
    expect((await db.monthlyBudgets.get(monthKey()))?.categories).toEqual(
      categories,
    );
    await useStore.getState().saveSettings({ ...settings, salary: 6000000 });
    expect(useStore.getState().categories).toEqual(
      expect.arrayContaining(categories),
    );
  });
  it("carries salary, split and category limits into the next month", async () => {
    await useStore.getState().saveSettings(settings);
    const cats = useStore
      .getState()
      .categories.map((c, i) => ({ ...c, limit: i === 0 ? 1500000 : 0 }));
    await useStore.getState().saveCategories(cats);
    const next = moveMonth(monthKey(), 1);
    await useStore.getState().ensureMonth(next);
    const budget = await db.monthlyBudgets.get(next);
    expect(budget?.salary).toBe(5000000);
    expect(budget?.buckets.needs).toBe(2500000);
    expect(budget?.categories[0].limit).toBe(1500000);
  });
  it("preserves an old month when the current salary changes", async () => {
    await useStore.getState().saveSettings(settings);
    const past = moveMonth(monthKey(), -1);
    await useStore.getState().ensureMonth(past);
    await useStore.getState().saveSettings({ ...settings, salary: 7000000 });
    expect((await db.monthlyBudgets.get(past))?.salary).toBe(5000000);
    expect((await db.monthlyBudgets.get(monthKey()))?.salary).toBe(7000000);
  });
  it("roundtrips a backup and rejects invalid references or amounts", async () => {
    await useStore.getState().saveSettings(settings);
    const backup = await makeBackup();
    expect(validateBackup(JSON.parse(JSON.stringify(backup)))).toEqual(backup);
    await restoreBackup(backup);
    expect(await db.settings.get(1)).toEqual(settings);
    expect(() =>
      validateBackup({ ...backup, settings: { ...settings, salary: 1.1 } }),
    ).toThrow();
    expect(() =>
      validateBackup({
        ...backup,
        transactions: [
          {
            id: "bad",
            amount: 100,
            bucket: "needs",
            categoryId: "missing",
            note: "",
            date: "2026-02-31",
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    ).toThrow();
  });
  it("archives current categories without changing historical snapshots or transactions", async () => {
    await useStore.getState().saveSettings(settings);
    const category = useStore.getState().categories[0];
    const past = moveMonth(monthKey(), -1);
    await useStore.getState().ensureMonth(past);
    const transaction = {
      id: "historic",
      amount: 12550,
      bucket: category.bucket,
      categoryId: category.id,
      note: "A preserved entry",
      date: `${past}-10`,
      createdAt: new Date().toISOString(),
    };
    await useStore.getState().saveTransaction(transaction);
    await useStore
      .getState()
      .saveCategories(
        useStore
          .getState()
          .categories.map((c) =>
            c.id === category.id
              ? { ...c, name: "Renamed", archived: true }
              : c,
          ),
      );
    expect(
      (await db.monthlyBudgets.get(past))?.categories.find(
        (c) => c.id === category.id,
      )?.name,
    ).toBe(category.name);
    expect(
      (await db.monthlyBudgets.get(monthKey()))?.categories.find(
        (c) => c.id === category.id,
      )?.archived,
    ).toBe(true);
    expect(await db.transactions.get(transaction.id)).toEqual(transaction);
    await useStore.getState().deleteTransaction(transaction.id);
    expect(await db.transactions.get(transaction.id)).toBeUndefined();
    await useStore.getState().saveTransaction(transaction);
    expect(await db.transactions.get(transaction.id)).toEqual(transaction);
  });
  it("leaves existing data intact when a malformed restore is rejected", async () => {
    await useStore.getState().saveSettings(settings);
    const backup = await makeBackup();
    const invalid = {
      ...backup,
      monthlyBudgets: backup.monthlyBudgets.map((b) => ({
        ...b,
        buckets: { ...b.buckets, needs: 1 },
      })),
    };
    await expect(restoreBackup(invalid)).rejects.toThrow();
    expect(await makeBackup()).toMatchObject({
      settings,
      monthlyBudgets: backup.monthlyBudgets,
    });
  });
  it("starts weeks on Monday, across month and year boundaries", () => {
    expect(mondayKey("2026-11-01")).toBe("2026-10-26");
    expect(mondayKey("2026-11-02")).toBe("2026-11-02");
    expect(moveMonth("2026-12", 1)).toBe("2027-01");
  });
});
