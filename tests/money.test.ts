import { describe, expect, it } from "vitest";
import {
  allocate,
  money,
  parseMoney,
  remaining,
  splitBudget,
  status,
  sumSpent,
  usage,
} from "../src/utils/money";
import type { Transaction } from "../src/types";
describe("precise money calculations", () => {
  it("parses paise without binary rounding errors", () => {
    expect(parseMoney("1234.56")).toBe(123456);
    expect(parseMoney("0.29")).toBe(29);
    expect(parseMoney("1.1")).toBe(110);
    expect(parseMoney("1.001")).toBeNaN();
    expect(parseMoney("-10")).toBeNaN();
    expect(parseMoney("")).toBeNaN();
    expect(parseMoney("Infinity")).toBeNaN();
  });
  it("formats Indian rupees", () => {
    expect(money(12500000)).toBe("₹1,25,000");
    expect(money(12345)).toBe("₹123.45");
  });
  it("splits salary with the default and custom ratios", () => {
    expect(
      splitBudget({
        salary: 7000000,
        needsPct: 50,
        wantsPct: 30,
        savingsPct: 20,
        splitMode: "ratio",
      }),
    ).toEqual({ needs: 3500000, wants: 2100000, savings: 1400000 });
    expect(allocate(100000, [60, 20, 20])).toEqual([60000, 20000, 20000]);
  });
  it("assigns rounding leftovers consistently without losing a paise", () => {
    expect(allocate(101, [50, 30, 20])).toEqual([51, 30, 20]);
    for (let total = 1; total < 1000; total++)
      expect(
        allocate(total, [3333, 3333, 3334]).reduce((a, b) => a + b, 0),
      ).toBe(total);
  });
  it("uses integer-safe multiplication for large amounts", () => {
    expect(allocate(99999999999, [99999999998, 1, 0])).toEqual([
      99999999998, 1, 0,
    ]);
  });
  it("preserves amount allocations and scales them with salary", () => {
    expect(
      splitBudget({
        salary: 7000000,
        needsPct: 50,
        wantsPct: 30,
        savingsPct: 20,
        splitMode: "amount",
        amountWeights: [3500001, 2099999, 1400000],
      }),
    ).toEqual({ needs: 3500001, wants: 2099999, savings: 1400000 });
    expect(allocate(100000, [25000, 15000, 10000])).toEqual([
      50000, 30000, 20000,
    ]);
  });
  it("rejects invalid weights", () => {
    expect(() => allocate(100, [0, 0, 0])).toThrow();
    expect(() => allocate(100, [-1, 2, 3])).toThrow();
  });
  it("calculates remaining, spending and over-budget states", () => {
    const rows = [
      { id: "1", amount: 20050, bucket: "needs", categoryId: "food" },
      { id: "2", amount: 10025, bucket: "needs", categoryId: "rent" },
      { id: "3", amount: 9000, bucket: "wants", categoryId: "dining" },
    ] as Transaction[];
    expect(sumSpent(rows)).toBe(39075);
    expect(sumSpent(rows, "needs")).toBe(30075);
    expect(sumSpent(rows, undefined, "food")).toBe(20050);
    expect(remaining(25000, sumSpent(rows, "needs"))).toBe(-5075);
    expect(status(80, 100)).toBe("warning");
    expect(status(101, 100)).toBe("danger");
    expect(status(0, 0)).toBe("normal");
    expect(status(1, 0)).toBe("danger");
    expect(usage(0, 0)).toBe(0);
  });
});
