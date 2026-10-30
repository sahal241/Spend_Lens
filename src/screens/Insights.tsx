import { useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "../store/useStore";
import { BUCKETS, META } from "../types";
import type { Transaction } from "../types";
import { mondayKey, monthKey, moveMonth } from "../utils/dates";
import { money, sumSpent, usage } from "../utils/money";
import { BucketIcon, Empty, Icon, MonthNav, Progress } from "../components/UI";
import { TransactionsList } from "../components/TransactionsList";
export function Insights({ onEdit }: { onEdit: (t: Transaction) => void }) {
  const { transactions, budgets, categories } = useStore();
  const [month, setMonth] = useState(monthKey());
  const budget = budgets.find((b) => b.monthKey === month);
  const cats = budget?.categories ?? categories;
  const rows = transactions.filter((t) => t.date.startsWith(month));
  const total = sumSpent(rows);
  const donut = BUCKETS.map((b) => ({
    name: META[b].label,
    value: sumSpent(rows, b) / 100,
    bucket: b,
  }));
  const breakdown = cats
    .map((c) => ({ ...c, spent: sumSpent(rows, undefined, c.id) }))
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent);
  const weekly: Record<string, number> = {};
  const last = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  for (let day = 1; day <= last; day++) {
    const key = mondayKey(`${month}-${String(day).padStart(2, "0")}`);
    weekly[key] ??= 0;
  }
  rows.forEach((t) => {
    weekly[mondayKey(t.date)] += t.amount;
  });
  const weeks = Object.entries(weekly).map(([date, value]) => ({
    date,
    label: new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }),
    amount: value / 100,
  }));
  const previous = transactions.filter((t) =>
    t.date.startsWith(moveMonth(month, -1)),
  );
  const insights: string[] = [];
  for (const c of breakdown) {
    const prior = sumSpent(previous, undefined, c.id);
    if (prior > 0) {
      const change = Math.round(((c.spent - prior) / prior) * 100);
      if (Math.abs(change) >= 1)
        insights.push(
          `You spent ${Math.abs(change)}% ${change > 0 ? "more" : "less"} on ${c.name} than last month.`,
        );
    }
    if (c.limit > 0 && c.spent / c.limit >= 0.8)
      insights.push(
        `${c.name} is at ${usage(c.spent, c.limit)}% of its limit${c.spent > c.limit ? ` — over by ${money(c.spent - c.limit)}` : ""}.`,
      );
  }
  if (total > 0 && !insights.length)
    insights.push(
      `${META[donut.reduce((a, b) => (a.value > b.value ? a : b)).bucket].label} makes up the largest part of your spending this month.`,
    );
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">STEP BACK. SEE THE BIG PICTURE.</span>
        <h1>
          A little perspective<span>.</span>
        </h1>
        <p>Small habits. Meaningful progress.</p>
      </div>
      <MonthNav value={month} onChange={setMonth} />
      {month !== monthKey() && (
        <p className="read-only-note">
          <Icon name="LockKeyhole" size={14} /> Past budgets are preserved.
          Transactions can still be edited.
        </p>
      )}
      <section className="card chart-card">
        <div className="section-heading">
          <h2>Your month, in focus</h2>
          <Icon name="ChartNoAxesCombined" size={19} />
        </div>
        {total > 0 ? (
          <>
            <div className="donut-container">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={donut}
                    dataKey="value"
                    innerRadius={79}
                    outerRadius={101}
                    cornerRadius={7}
                    paddingAngle={5}
                    stroke="none"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {donut.map((d) => (
                      <Cell fill={META[d.bucket].color} key={d.bucket} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      money(Math.round(Number(value) * 100))
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <span>TOTAL ALLOCATED</span>
                <strong>{money(total)}</strong>
                <span>spent & saved this month</span>
              </div>
            </div>
            <div className="chart-legend">
              {donut.map((d) => (
                <div key={d.bucket}>
                  <span>
                    <i style={{ background: META[d.bucket].color }} />
                    {d.name}
                  </span>
                  <strong>{Math.round((d.value * 10000) / total)}%</strong>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty
            title="Your bigger picture starts here"
            text="Log a few expenses to see where your money goes."
            icon="ChartNoAxesCombined"
          />
        )}
      </section>
      <section className="card insight-budget">
        <div className="section-heading">
          <h2>Budget vs. spent</h2>
          <span className="micro muted">YOUR MONTHLY PLAN</span>
        </div>
        {BUCKETS.map((b) => {
          const used = sumSpent(rows, b),
            limit = budget?.buckets[b] ?? 0;
          return (
            <div className="insight-budget-row" key={b}>
              <div className="row-between">
                <div className="inline-label">
                  <BucketIcon bucket={b} />
                  <strong>{META[b].label}</strong>
                </div>
                <span className={used > limit ? "danger-text" : "muted"}>
                  {usage(used, limit)}% used
                </span>
              </div>
              <p>
                {money(used)}{" "}
                <span className="muted">
                  of {money(limit)} •{" "}
                  {budget?.salary
                    ? Math.round((limit / budget.salary) * 100)
                    : 0}
                  % of salary
                </span>
              </p>
              <Progress spent={used} limit={limit} bucket={b} />
            </div>
          );
        })}
      </section>
      <section className="card subcategory-chart">
        <div className="section-heading">
          <h2>Where it went</h2>
          <Icon name="SlidersHorizontal" size={17} />
        </div>
        {breakdown.length ? (
          breakdown.map((c) => (
            <div className="subcategory-bar" key={c.id}>
              <div className="row-between">
                <span>{c.name}</span>
                <strong>{money(c.spent)}</strong>
              </div>
              <div className="progress">
                <div
                  style={{
                    width: `${(c.spent / breakdown[0].spent) * 100}%`,
                    background: META[c.bucket].color,
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="muted">Every expense will find its place here.</p>
        )}
      </section>
      <section className="card weekly-chart">
        <div className="section-heading">
          <div>
            <h2>Week by week</h2>
            <p>Weeks start on Monday</p>
          </div>
          <span className="micro muted">₹</span>
        </div>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart
            data={weeks}
            margin={{ top: 15, right: 0, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 4"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--secondary)", fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--secondary)", fontSize: 10 }}
              tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
            />
            <Tooltip
              cursor={{ fill: "var(--tint)" }}
              formatter={(value) => money(Math.round(Number(value) * 100))}
            />
            <Bar
              dataKey="amount"
              name="Spent & saved"
              fill="#4F46E5"
              radius={[5, 5, 0, 0]}
              maxBarSize={34}
            />
          </BarChart>
        </ResponsiveContainer>
      </section>
      <section className="insight-notes">
        <div className="section-heading">
          <h2>A few things to notice</h2>
          <Icon name="Sparkles" size={18} />
        </div>
        {(insights.length
          ? insights.slice(0, 3)
          : [
              "Your next small step? Log an expense. Clarity builds one entry at a time.",
            ]
        ).map((text, i) => (
          <div className="insight-note" key={i}>
            <Icon name={i % 2 ? "TrendingUp" : "Sparkles"} size={19} />
            <p>{text}</p>
          </div>
        ))}
      </section>
      <section>
        <div className="section-heading">
          <div>
            <h2>The biggest pieces</h2>
            <p>Top 5 expenses this month</p>
          </div>
        </div>
        <div className="card">
          <TransactionsList
            transactions={[...rows]
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 5)}
            categories={[...cats, ...categories]}
            onEdit={onEdit}
          />
        </div>
      </section>
      <p className="footer-note">
        All totals include savings contributions you’ve logged.
      </p>
    </>
  );
}
