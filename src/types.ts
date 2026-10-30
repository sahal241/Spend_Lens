export type Bucket = "needs" | "wants" | "savings";
export type Theme = "system" | "light" | "dark";
export interface Settings {
  id: number;
  salary: number;
  splitMode: "ratio" | "amount";
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
  amountWeights?: number[];
  theme: Theme;
  reminderTime: string | null;
  lastBucket?: Bucket;
  lastCategoryId?: string;
  reminderLastDate?: string;
}
export interface Category {
  id: string;
  bucket: Bucket;
  name: string;
  icon: string;
  limit: number;
  order: number;
  archived?: boolean;
}
export interface Transaction {
  id: string;
  amount: number;
  bucket: Bucket;
  categoryId: string;
  note: string;
  date: string;
  createdAt: string;
}
export interface MonthlyBudget {
  carriedFrom?: string;
  reviewed?: boolean;
  monthKey: string;
  salary: number;
  buckets: Record<Bucket, number>;
  categories: Category[];
}
export const BUCKETS: Bucket[] = ["needs", "wants", "savings"];
export const META = {
  needs: {
    label: "Needs",
    color: "#4F46E5",
    description: "The everyday essentials",
    icon: "House",
  },
  wants: {
    label: "Wants",
    color: "#EC4899",
    description: "A little joy, planned",
    icon: "Sparkles",
  },
  savings: {
    label: "Savings",
    color: "#14B8A6",
    description: "For your future self",
    icon: "Sprout",
  },
};
