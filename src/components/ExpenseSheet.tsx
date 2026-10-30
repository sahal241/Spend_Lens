import { useState } from "react";
import type { Bucket, Transaction } from "../types";
import { BUCKETS, META } from "../types";
import { useStore } from "../store/useStore";
import { localDate } from "../utils/dates";
import { money, moneyInput, parseMoney, sumSpent } from "../utils/money";
import { BucketIcon, Icon, Modal, useFeedback } from "./UI";
export function ExpenseSheet({
  transaction,
  onClose,
}: {
  transaction?: Transaction;
  onClose: () => void;
}) {
  const { settings, categories, budgets, saveTransaction, deleteTransaction } =
    useStore();
  const [amount, setAmount] = useState(
    transaction ? moneyInput(transaction.amount) : "",
  );
  const [bucket, setBucket] = useState<Bucket>(
    transaction?.bucket ?? settings?.lastBucket ?? "needs",
  );
  const [categoryId, setCategoryId] = useState(
    transaction?.categoryId ?? settings?.lastCategoryId ?? "",
  );
  const [note, setNote] = useState(transaction?.note ?? "");
  const [date, setDate] = useState(transaction?.date ?? localDate());
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { run, toast } = useFeedback();
  const snapshot = budgets.find((b) => b.monthKey === date.slice(0, 7));
  const choices = (snapshot?.categories ?? categories)
    .filter(
      (c) =>
        (!c.archived || c.id === transaction?.categoryId) &&
        c.bucket === bucket,
    )
    .sort((a, b) => a.order - b.order);
  const actualId = choices.some((c) => c.id === categoryId)
    ? categoryId
    : (choices[0]?.id ?? "");
  const value = parseMoney(amount);
  const valid =
    Number.isFinite(value) &&
    value > 0 &&
    actualId &&
    date &&
    date <= localDate() &&
    date >= "2000-01-01";
  const save = () =>
    void run(async () => {
      if (!valid) return;
      setBusy(true);
      try {
        const t: Transaction = {
          id: transaction?.id ?? crypto.randomUUID(),
          amount: value,
          bucket,
          categoryId: actualId,
          note: note.trim(),
          date,
          createdAt: transaction?.createdAt ?? new Date().toISOString(),
        };
        await saveTransaction(t);
        const c = (
          useStore
            .getState()
            .budgets.find((b) => b.monthKey === date.slice(0, 7))?.categories ??
          categories
        ).find((c) => c.id === actualId);
        const used = sumSpent(
          useStore
            .getState()
            .transactions.filter((t) => t.date.startsWith(date.slice(0, 7))),
          undefined,
          actualId,
        );
        toast(transaction ? "Expense updated." : "Expense saved.", {
          label: "Undo",
          run: async () => {
            if (transaction) await saveTransaction(transaction);
            else await deleteTransaction(t.id);
          },
        });
        if (c && used > c.limit)
          toast(
            `${c.name} is over its limit by ${money(used - c.limit)}.`,
            undefined,
            true,
          );
        onClose();
      } finally {
        setBusy(false);
      }
    });
  const remove = () =>
    void run(async () => {
      if (!transaction) return;
      setBusy(true);
      try {
        await deleteTransaction(transaction.id);
        toast("Expense deleted.", {
          label: "Undo",
          run: () => saveTransaction(transaction),
        });
        onClose();
      } finally {
        setBusy(false);
      }
    });
  return (
    <Modal
      title={transaction ? "Edit expense" : "Log expense"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <p className="sheet-subtitle">A little entry. A clearer picture.</p>
        <label htmlFor="expense-amount" className="field-label">
          How much?
        </label>
        <div className="expense-input">
          <span>₹</span>
          <input
            autoFocus
            data-autofocus
            id="expense-amount"
            value={amount}
            inputMode="decimal"
            placeholder="0"
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <span>INR</span>
        </div>
        <label className="field-label">Where does it belong?</label>
        <div className="bucket-picker">
          {BUCKETS.map((b) => (
            <button
              type="button"
              key={b}
              className={`${b} ${bucket === b ? "selected" : ""}`}
              aria-pressed={bucket === b}
              onClick={() => {
                setBucket(b);
                setCategoryId("");
              }}
            >
              <BucketIcon bucket={b} />
              {META[b].label}
              {bucket === b && <Icon name="Check" size={14} />}
            </button>
          ))}
        </div>
        <label className="field-label" htmlFor="expense-category">
          Subcategory
        </label>
        <select
          id="expense-category"
          value={actualId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {choices.length === 0 && (
            <option value="">No subcategories — add one in Settings</option>
          )}
          {choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="field-label" htmlFor="expense-note">
          Note <span className="muted">(optional)</span>
        </label>
        <input
          id="expense-note"
          maxLength={200}
          placeholder="What was it for?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <label className="field-label" htmlFor="expense-date">
          Date
        </label>
        <input
          id="expense-date"
          type="date"
          min="2000-01-01"
          max={localDate()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        {!Number.isFinite(value) && amount && (
          <p className="danger-text">
            Enter a valid amount with up to two decimal places.
          </p>
        )}
        <div className="form-actions">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button primary flex-1"
            type="submit"
            disabled={!valid || busy}
          >
            <Icon name="Check" size={18} />
            {busy ? "Saving…" : transaction ? "Save changes" : "Save expense"}
          </button>
        </div>
        {transaction && (
          <div className="delete-expense">
            {confirm ? (
              <div className="confirm-inline">
                <span>Delete this expense?</span>
                <button
                  type="button"
                  className="text-button danger-text"
                  onClick={remove}
                  disabled={busy}
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setConfirm(false)}
                >
                  Keep it
                </button>
              </div>
            ) : (
              <button
                className="text-button danger-text"
                type="button"
                onClick={() => setConfirm(true)}
              >
                <Icon name="Trash2" size={16} /> Delete expense
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
