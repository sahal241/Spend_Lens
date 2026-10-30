import Dexie, { type Table } from "dexie";
import type { Settings, Category, Transaction, MonthlyBudget } from "../types";
class SpendLensDB extends Dexie {
  settings!: Table<Settings, number>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  monthlyBudgets!: Table<MonthlyBudget, string>;
  constructor() {
    super("SpendLens");
    this.version(1).stores({
      settings: "id",
      categories: "id, bucket, order",
      transactions: "id, date, bucket, categoryId",
      monthlyBudgets: "monthKey",
    });
  }
}
export const db = new SpendLensDB();
export const defaults = (): Category[] => {
  const groups = {
    needs: [
      ["Rent", "House"],
      ["Food", "Utensils"],
      ["Travel", "TrainFront"],
      ["Subscriptions", "Repeat"],
      ["Home", "Sofa"],
      ["Bills and Utilities", "Lightbulb"],
      ["Health", "HeartPulse"],
      ["EMI/Loans", "Landmark"],
    ],
    wants: [
      ["Shopping", "ShoppingBag"],
      ["Dining Out", "Coffee"],
      ["Entertainment", "Clapperboard"],
      ["Subscriptions (OTT)", "Tv"],
      ["Personal Care", "Smile"],
      ["Gifts", "Gift"],
    ],
    savings: [
      ["SIP/Mutual Funds", "ChartNoAxesCombined"],
      ["Emergency Fund", "ShieldCheck"],
      ["FD/RD", "Landmark"],
      ["Gold", "Gem"],
      ["Other Investments", "Sprout"],
    ],
  };
  return Object.entries(groups).flatMap(([bucket, items]) =>
    items.map(([name, icon], order) => ({
      id: crypto.randomUUID(),
      bucket: bucket as Category["bucket"],
      name,
      icon,
      limit: 0,
      order,
    })),
  );
};
