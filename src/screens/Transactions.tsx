import { useState } from "react";
import { BUCKETS, META } from "../types";
import type { Bucket, Transaction } from "../types";
import { useStore } from "../store/useStore";
import { monthKey } from "../utils/dates";
import { money, sumSpent } from "../utils/money";
import { Empty, Icon, MonthNav } from "../components/UI";
import { TransactionsList } from "../components/TransactionsList";
export function Transactions({ onEdit }: { onEdit: (t: Transaction) => void }) {
  const { transactions, categories, budgets } = useStore();
  const [month, setMonth] = useState(monthKey());
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<Bucket | "">("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filters, setFilters] = useState(false);
  const snapshot = budgets.find((b) => b.monthKey === month);
  const cats = snapshot?.categories ?? categories;
  const lookup = [
    ...cats,
    ...categories,
    ...budgets.flatMap((b) => b.categories),
  ];
  const rows = transactions.filter(
    (t) =>
      t.date.startsWith(month) &&
      (!bucket || t.bucket === bucket) &&
      (!category || t.categoryId === category) &&
      (!from || t.date >= from) &&
      (!to || t.date <= to) &&
      `${t.note} ${lookup.find((c) => c.id === t.categoryId)?.name ?? ""} ${META[t.bucket].label}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">EVERY LITTLE DETAIL</span>
        <h1>
          Your transactions<span>.</span>
        </h1>
        <p>The story behind every rupee.</p>
      </div>
      <MonthNav value={month} onChange={setMonth} />
      <div className="search-row">
        <div className="search-input">
          <Icon name="Search" size={18} />
          <input
            aria-label="Search transactions"
            placeholder="Find a transaction…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="icon-button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <Icon name="X" size={15} />
            </button>
          )}
        </div>
        <button
          className={`icon-button filter-button ${filters ? "active" : ""}`}
          aria-label="Toggle transaction filters"
          aria-expanded={filters}
          onClick={() => setFilters(!filters)}
        >
          <Icon name="SlidersHorizontal" />
        </button>
      </div>
      <div className="filter-chips">
        <button
          className={!bucket ? "active" : ""}
          onClick={() => {
            setBucket("");
            setCategory("");
          }}
        >
          All
        </button>
        {BUCKETS.map((b) => (
          <button
            className={`${b} ${bucket === b ? "active" : ""}`}
            key={b}
            onClick={() => {
              setBucket(b);
              setCategory("");
            }}
          >
            <span className="tiny-dot" style={{ background: META[b].color }} />
            {META[b].label}
          </button>
        ))}
      </div>
      {filters && (
        <div className="card filters-panel">
          <label htmlFor="filter-subcategory">Subcategory</label>
          <select
            id="filter-subcategory"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All subcategories</option>
            {cats
              .filter((c) => !bucket || c.bucket === bucket)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <div className="two-fields">
            <label>
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                min={from}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
          {from && to && from > to && (
            <p className="danger-text">End date must be after start date.</p>
          )}
          <button
            className="text-button"
            onClick={() => {
              setSearch("");
              setBucket("");
              setCategory("");
              setFrom("");
              setTo("");
            }}
          >
            Clear all filters
          </button>
        </div>
      )}
      <div className="transaction-total">
        <span>
          {rows.length} transaction{rows.length !== 1 ? "s" : ""}
        </span>
        <strong>{money(sumSpent(rows))}</strong>
      </div>
      {rows.length ? (
        <TransactionsList
          transactions={rows}
          categories={lookup}
          onEdit={onEdit}
          grouped
        />
      ) : (
        <div className="card">
          <Empty
            title="Nothing here just yet"
            text="Try another month or filter, or use + to log your first expense."
            icon="Search"
          />
        </div>
      )}
      <p className="footer-note">Tap any transaction to edit or delete it.</p>
    </>
  );
}
