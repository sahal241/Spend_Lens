import { GlowingShadow } from "../components/ui/glowing-shadow";
import { useState } from "react";
import { db } from "../db";
import { useStore } from "../store/useStore";
import { BUCKETS, META } from "../types";
import type { Bucket, Transaction } from "../types";
import { dateLabel, localDate, monthKey, monthLabel } from "../utils/dates";
import { money, sumSpent, usage } from "../utils/money";
import { BucketIcon, Icon, Progress } from "../components/UI";
import { CategoryList } from "../components/CategoryList";
import { TransactionsList } from "../components/TransactionsList";
export function Home({
  onEdit,
  onBudget,
  onTransactions,
  onAdd,
  onManage,
}: {
  onEdit: (t: Transaction) => void;
  onBudget: () => void;
  onTransactions: () => void;
  onAdd: () => void;
  onManage: () => void;
}) {
  const { settings, transactions, budgets, categories } = useStore();
  const [expanded, setExpanded] = useState<Bucket | null>("needs");
  const budget = budgets.find((b) => b.monthKey === monthKey());
  if (!settings || !budget) return null;
  const rows = transactions.filter((t) => t.date.startsWith(monthKey()));
  const spent = sumSpent(rows);
  const today = sumSpent(rows.filter((t) => t.date === localDate()));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return (
    <>
      <section className="greeting">
        <div>
          <p className="eyebrow">A LITTLE CLARITY, EVERY DAY</p>
          <h1>
            Good {greeting}
            <span className="greeting-dot">.</span>
          </h1>
          <p className="today-date">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            <span>Weeks start Monday</span>
          </p>
        </div>
        <span className="greeting-symbol">
          <Icon name={hour < 17 ? "Sun" : "Moon"} size={25} />
        </span>
      </section>
      {budget.carriedFrom && !budget.reviewed && (
        <div className="rollover-note">
          <Icon name="Sprout" size={22} />
          <div>
            <strong>A fresh month, a familiar plan.</strong>
            <p>Your salary, split and limits carried forward.</p>
            <button className="text-button" onClick={onBudget}>
              Review plan
            </button>
            <button
              className="text-button"
              onClick={() =>
                void db.monthlyBudgets
                  .update(monthKey(), { reviewed: true })
                  .then(() => useStore.getState().refresh())
              }
            >
              Keep this plan
            </button>
          </div>
        </div>
      )}
      <section className="hero-card">
        <div className="hero-orbit orbit-a" />
        <div className="hero-orbit orbit-b" />
        <div className="hero-top">
          <span>
            <span className="live-dot" /> TODAY, IN FOCUS
          </span>
          <Icon name="ArrowUpRight" size={22} />
        </div>
        <div className="hero-amount">{money(today)}</div>
        <p className="hero-label">spent today</p>
        <div className="hero-bottom">
          <span>
            <strong>{money(budget.salary - spent)}</strong> left of your monthly
            budget
          </span>
          <div className="mini-sparkline">
            <svg viewBox="0 0 70 30" aria-hidden="true">
              <path
                d="M2 25 12 22 19 24 31 13 40 17 49 9 58 13 68 2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </section>
      <section className="salary-card">
        <span className="salary-icon">
          <Icon name="Banknote" size={23} />
        </span>
        <div className="flex-1">
          <span className="muted">Monthly take-home</span>
          <strong>
            {money(budget.salary)}
            <span>/ month</span>
          </strong>
        </div>
        <button className="edit-pill" onClick={onBudget}>
          <Icon name="Pencil" size={13} />
          Edit
        </button>
      </section>
      <section className="remaining-section">
        <div className="section-heading">
          <div>
            <h2>Room for what matters</h2>
            <p>Remaining this month</p>
          </div>
          <span className="month-pill">
            {new Date().toLocaleDateString("en-IN", { month: "short" })}
            <span className="tiny-dot" />
          </span>
        </div>
        <div className="bucket-grid">
          {BUCKETS.map((b) => {
            const used = sumSpent(rows, b),
              left = budget.buckets[b] - used;
            return (
              <GlowingShadow
                accent={META[b].color}
                phase={-BUCKETS.indexOf(b) * 2.3}
                className={`bucket-card ${b} ${expanded === b ? "expanded" : ""}`}
                key={b}
                onClick={() => setExpanded(expanded === b ? null : b)}
                aria-expanded={expanded === b}
              >
                <div className="row-between">
                  <BucketIcon bucket={b} />
                  <Icon name="ChevronDown" size={14} />
                </div>
                <span className="bucket-name">{META[b].label}</span>
                <strong className={left < 0 ? "danger-text" : ""}>
                  {money(left)}
                </strong>
                <span className="micro">
                  {left < 0
                    ? "over budget"
                    : "left to " + (b === "savings" ? "save" : "spend")}
                </span>
                <Progress spent={used} limit={budget.buckets[b]} bucket={b} />
                <div className="bucket-foot">
                  <span>{usage(used, budget.buckets[b])}% used</span>
                  <span>
                    {money(used)} {b === "savings" ? "saved" : "spent"}
                  </span>
                </div>
              </GlowingShadow>
            );
          })}
        </div>
        {expanded && (
          <div className="expanded-budget card">
            <div className="section-heading">
              <div>
                <h3>{META[expanded].label}, a little closer</h3>
                <p>{META[expanded].description}</p>
              </div>
              <button
                className="icon-button"
                onClick={onManage}
                aria-label="Manage subcategory budgets"
              >
                <Icon name="SlidersHorizontal" size={18} />
              </button>
            </div>
            {(() => {
              const limit = budget.categories
                .filter((c) => c.bucket === expanded && !c.archived)
                .reduce((s, c) => s + c.limit, 0);
              const gap = budget.buckets[expanded] - limit;
              return (
                <div
                  className={`allocation-info ${gap < 0 ? "danger-text" : ""}`}
                >
                  <Icon name={gap < 0 ? "CircleHelp" : "Check"} size={13} />
                  {gap < 0
                    ? `${money(-gap)} over bucket budget`
                    : `${money(gap)} unallocated`}
                </div>
              );
            })()}
            <CategoryList
              bucket={expanded}
              categories={budget.categories}
              transactions={rows}
            />
            <button className="text-button manage-link" onClick={onManage}>
              Adjust subcategory budgets
              <Icon name="ArrowUpRight" size={14} />
            </button>
          </div>
        )}
      </section>
      <section className="recent-section">
        <div className="section-heading">
          <div>
            <h2>The little details</h2>
            <p>Recent transactions</p>
          </div>
          <button className="text-button" onClick={onTransactions}>
            See all
            <Icon name="ArrowUpRight" size={15} />
          </button>
        </div>
        <div className="card recent-card">
          <TransactionsList
            transactions={transactions.slice(0, 5)}
            categories={[
              ...categories,
              ...budgets.flatMap((b) => b.categories),
            ]}
            onEdit={onEdit}
            budgets={budgets}
          />
          {transactions.length === 0 && (
            <button className="button secondary empty-action" onClick={onAdd}>
              <Icon name="Plus" size={17} />
              Log your first expense
            </button>
          )}
        </div>
      </section>
      <p className="footer-note">
        <Icon name="ShieldCheck" size={14} /> A clearer picture. A calmer you.
      </p>
      <span className="sr-only">
        Viewing {monthLabel(monthKey())}. {dateLabel(localDate())}.
      </span>
    </>
  );
}
