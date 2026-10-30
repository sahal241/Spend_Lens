import type { Category, MonthlyBudget, Transaction } from "../types";
import { META } from "../types";
import { BucketIcon, Empty, Icon } from "./UI";
import { money } from "../utils/money";
import { dateLabel } from "../utils/dates";
export function TransactionsList({
  transactions,
  categories,
  onEdit,
  grouped = false,
  budgets,
}: {
  transactions: Transaction[];
  categories: Category[];
  onEdit: (t: Transaction) => void;
  grouped?: boolean;
  budgets?: MonthlyBudget[];
}) {
  if (!transactions.length) return <Empty />;
  let prev = "";
  return (
    <div className="transaction-list">
      {transactions.map((t) => {
        const c =
          budgets
            ?.find((b) => b.monthKey === t.date.slice(0, 7))
            ?.categories.find((c) => c.id === t.categoryId) ??
          categories.find((c) => c.id === t.categoryId);
        const heading = prev !== t.date;
        prev = t.date;
        return (
          <div key={t.id}>
            {grouped && heading && (
              <h3 className="date-group">{dateLabel(t.date)}</h3>
            )}
            <button
              className="transaction-row"
              onClick={() => onEdit(t)}
              aria-label={`Edit ${c?.name ?? META[t.bucket].label} expense of ${money(t.amount)}`}
            >
              <BucketIcon bucket={t.bucket} name={c?.icon} />
              <div className="flex-1 min-w-0">
                <strong>{t.note || c?.name || META[t.bucket].label}</strong>
                <span>
                  {c?.name ?? "Archived category"}{" "}
                  <span className="dot-separator">·</span>{" "}
                  {grouped ? META[t.bucket].label : dateLabel(t.date)}
                </span>
              </div>
              <div className="transaction-amount">
                <strong>−{money(t.amount)}</strong>
                <span className={t.bucket}>{META[t.bucket].label}</span>
              </div>
              <Icon name="ChevronRight" size={14} className="row-arrow" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
