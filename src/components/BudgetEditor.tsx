import { useState } from "react";
import type { Settings } from "../types";
import { BUCKETS, META } from "../types";
import { allocate, money, moneyInput, parseMoney } from "../utils/money";
import { BucketIcon, Icon, useFeedback } from "./UI";
import { useStore } from "../store/useStore";
export function BudgetEditor({
  initial,
  onDone,
  onCancel,
}: {
  initial?: Settings | null;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [salary, setSalary] = useState(
    initial ? moneyInput(initial.salary) : "",
  );
  const [mode, setMode] = useState<"ratio" | "amount">(
    initial?.splitMode ?? "ratio",
  );
  const [ratios, setRatios] = useState(
    (initial
      ? [initial.needsPct, initial.wantsPct, initial.savingsPct]
      : [50, 30, 20]
    ).map(String),
  );
  const salaryValue = parseMoney(salary);
  const [amounts, setAmounts] = useState(() => {
    if (!initial) return ["", "", ""];
    const weights =
      initial.splitMode === "amount" && initial.amountWeights
        ? initial.amountWeights
        : [initial.needsPct, initial.wantsPct, initial.savingsPct].map((v) =>
            Math.round(v * 100),
          );
    return allocate(initial.salary, weights).map(moneyInput);
  });
  const [busy, setBusy] = useState(false);
  const { run, toast } = useFeedback();
  const pctTotal = ratios.reduce(
    (sum, v) => sum + Math.round(Number(v) * 100),
    0,
  );
  const amountValues = amounts.map(parseMoney);
  const amountTotal = amountValues.reduce((a, b) => a + b, 0);
  const ratioValid = ratios.every(
    (v) => /^\d+(\.\d{0,2})?$/.test(v) && Number(v) <= 100,
  );
  const balanced =
    mode === "ratio"
      ? ratioValid && pctTotal === 10000
      : Number.isFinite(salaryValue) &&
        amountValues.every(Number.isFinite) &&
        amountTotal === salaryValue;
  const valid = Number.isFinite(salaryValue) && salaryValue > 0 && balanced;
  const weights = ratios.map((v) =>
    Number.isFinite(Number(v))
      ? Math.max(0, Math.min(10000, Math.round(Number(v || 0) * 100)))
      : 0,
  );
  const computed =
    mode === "ratio" && Number.isFinite(salaryValue)
      ? pctTotal === 10000
        ? allocate(salaryValue, weights)
        : weights.map((v) =>
            Number((BigInt(salaryValue) * BigInt(v) + 5000n) / 10000n),
          )
      : amountValues;
  const switchMode = (value: "ratio" | "amount") => {
    if (value === mode) return;
    if (value === "amount")
      setAmounts(
        computed.map((v) => (Number.isFinite(v) ? moneyInput(v) : "0")),
      );
    else if (amountTotal > 0) {
      const ps = allocate(
        10000,
        amountValues.map((v) => (Number.isFinite(v) ? v : 0)),
      );
      setRatios(ps.map((v) => String(v / 100)));
    }
    setMode(value);
  };
  const changeSalary = (value: string) => {
    const next = parseMoney(value);
    if (
      mode === "amount" &&
      Number.isFinite(next) &&
      amountTotal > 0 &&
      amountValues.every(Number.isFinite)
    )
      setAmounts(allocate(next, amountValues).map(moneyInput));
    setSalary(value);
  };
  const preset = (v: number[]) => {
    setRatios(v.map(String));
    if (Number.isFinite(salaryValue))
      setAmounts(allocate(salaryValue, v).map(moneyInput));
  };
  const save = () =>
    void run(async () => {
      if (!valid) return;
      setBusy(true);
      try {
        const pcts =
          mode === "ratio"
            ? ratios.map(Number)
            : allocate(10000, amountValues).map((v) => v / 100);
        await useStore.getState().saveSettings({
          ...initial,
          id: 1,
          salary: salaryValue,
          splitMode: mode,
          needsPct: pcts[0],
          wantsPct: pcts[1],
          savingsPct: pcts[2],
          amountWeights: mode === "amount" ? amountValues : undefined,
          theme: initial?.theme ?? "system",
          reminderTime: initial?.reminderTime ?? null,
        });
        toast(
          initial
            ? "Your monthly plan is updated."
            : "Your fresh start is ready.",
        );
        onDone();
      } finally {
        setBusy(false);
      }
    });
  return (
    <div className="budget-editor">
      <label className="field-label" htmlFor="salary">
        Monthly take-home salary
      </label>
      <div className="salary-input">
        <span>₹</span>
        <input
          id="salary"
          inputMode="decimal"
          placeholder="50,000"
          value={salary}
          onChange={(e) => changeSalary(e.target.value.replace(/,/g, ""))}
        />
        <span className="per-month">/ month</span>
      </div>
      <p className="field-hint">
        The amount that actually lands in your account.
      </p>
      <div className="section-heading">
        <h3>Give every rupee a purpose</h3>
      </div>
      <div className="segmented">
        {(["ratio", "amount"] as const).map((v) => (
          <button
            key={v}
            aria-pressed={mode === v}
            className={mode === v ? "active" : ""}
            onClick={() => switchMode(v)}
          >
            By {v === "ratio" ? "ratio %" : "amount ₹"}
          </button>
        ))}
      </div>
      <div className="presets">
        {[
          [50, 30, 20],
          [60, 20, 20],
          [70, 20, 10],
          [40, 30, 30],
        ].map((p) => (
          <button
            key={p.join()}
            className={
              p.every((v, i) => Number(ratios[i]) === v) ? "selected" : ""
            }
            onClick={() => preset(p)}
          >
            {p.join("/")}
          </button>
        ))}
      </div>
      <div className="split-rows">
        {BUCKETS.map((b, i) => (
          <div className="split-row" key={b}>
            <BucketIcon bucket={b} />
            <div className="flex-1">
              <strong>{META[b].label}</strong>
              <span>
                {mode === "ratio"
                  ? money(Number.isFinite(computed[i]) ? computed[i] : 0)
                  : `${salaryValue > 0 && Number.isFinite(amountValues[i]) ? ((amountValues[i] / salaryValue) * 100).toFixed(1) : 0}% of salary`}
              </span>
            </div>
            <div className="small-number">
              <input
                aria-label={`${META[b].label} ${mode === "ratio" ? "percentage" : "amount in rupees"}`}
                inputMode="decimal"
                value={mode === "ratio" ? ratios[i] : amounts[i]}
                onChange={(e) => {
                  const setter = mode === "ratio" ? setRatios : setAmounts;
                  setter((old) =>
                    old.map((v, j) => (j === i ? e.target.value : v)),
                  );
                }}
              />
              <span>{mode === "ratio" ? "%" : "₹"}</span>
            </div>
          </div>
        ))}
      </div>
      <div
        className={`balance-note ${balanced ? "balanced" : "unbalanced"}`}
        role="status"
      >
        <Icon name={balanced ? "Check" : "CircleHelp"} size={16} />
        {mode === "ratio"
          ? Number.isFinite(pctTotal)
            ? `Total ${(pctTotal / 100).toFixed(pctTotal % 100 ? 2 : 0)}%`
            : "Enter valid percentages"
          : Number.isFinite(amountTotal)
            ? `${money(amountTotal)} of ${money(salaryValue || 0)}`
            : "Enter valid amounts"}
        {balanced
          ? " • balanced ✓"
          : mode === "ratio"
            ? " • must equal 100%"
            : " • amounts must equal your salary"}
      </div>
      {!initial && (
        <div className="info-note">
          <Icon name="Sprout" />
          <p>
            A starting point, not a strict rule. Make this split yours, and
            adjust it whenever life changes.
          </p>
        </div>
      )}
      <div className="form-actions">
        {onCancel && (
          <button className="button secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          className="button primary flex-1"
          disabled={!valid || busy}
          onClick={save}
        >
          {busy
            ? "Saving…"
            : initial
              ? "Save monthly plan"
              : "Let’s bring it into focus"}
          <Icon name="ArrowUpRight" size={18} />
        </button>
      </div>
      {initial && (
        <p className="field-hint text-center">
          Updates this month and future months. Past budgets stay as they were.
        </p>
      )}
    </div>
  );
}
