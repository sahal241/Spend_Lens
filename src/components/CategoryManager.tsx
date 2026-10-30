import { useState } from "react";
import { BUCKETS, META } from "../types";
import type { Bucket, Category } from "../types";
import { useStore } from "../store/useStore";
import { monthKey } from "../utils/dates";
import { money, moneyInput, parseMoney } from "../utils/money";
import { BucketIcon, Icon, ICON_OPTIONS, Modal, useFeedback } from "./UI";
export function CategoryManager({ onClose }: { onClose: () => void }) {
  const { categories, budgets, saveCategories } = useStore();
  const [draft, setDraft] = useState<Category[]>(() =>
    structuredClone(
      budgets.find((b) => b.monthKey === monthKey())?.categories ?? categories,
    ),
  );
  const [open, setOpen] = useState<Bucket | null>("needs");
  const [editing, setEditing] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [icon, setIcon] = useState("Wallet");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast, run } = useFeedback();
  const budget = budgets.find((b) => b.monthKey === monthKey());
  const edit = (c: Category) => {
    setEditing(c.id);
    setName(c.name);
    setLimit(moneyInput(c.limit));
    setIcon(c.icon);
    setDeleting(null);
  };
  const apply = () => {
    const n = parseMoney(limit || "0");
    if (!name.trim() || !Number.isFinite(n)) return;
    setDraft((s) =>
      s.map((c) =>
        c.id === editing ? { ...c, name: name.trim(), limit: n, icon } : c,
      ),
    );
    setEditing(null);
    setNewId(null);
  };
  const cancelEdit = () => {
    if (editing === newId)
      setDraft((rows) => rows.filter((c) => c.id !== newId));
    setNewId(null);
    setEditing(null);
  };
  const reorder = (c: Category, direction: number) => {
    const rows = draft
      .filter((x) => x.bucket === c.bucket && !x.archived)
      .sort((a, b) => a.order - b.order);
    const index = rows.findIndex((x) => x.id === c.id);
    const other = rows[index + direction];
    if (!other) return;
    setDraft((old) =>
      old.map((x) =>
        x.id === c.id
          ? { ...x, order: other.order }
          : x.id === other.id
            ? { ...x, order: c.order }
            : x,
      ),
    );
  };
  const add = (bucket: Bucket) => {
    const c: Category = {
      id: crypto.randomUUID(),
      name: "New subcategory",
      icon: "Wallet",
      bucket,
      limit: 0,
      order:
        Math.max(
          -1,
          ...draft.filter((c) => c.bucket === bucket).map((c) => c.order),
        ) + 1,
    };
    setDraft((s) => [...s, c]);
    setNewId(c.id);
    edit(c);
  };
  const save = () =>
    void run(async () => {
      setBusy(true);
      try {
        await saveCategories(draft);
        toast("Subcategory budgets saved.");
        onClose();
      } finally {
        setBusy(false);
      }
    });
  return (
    <Modal title="Budget every rupee" onClose={onClose}>
      <p className="sheet-subtitle">
        Give the little things a place in your plan.
      </p>
      <div className="info-note">
        <Icon name="CircleHelp" size={18} />
        <p>
          Changes apply to this month and carry forward. Use the arrows to
          reorder your subcategories.
        </p>
      </div>
      {BUCKETS.map((b) => {
        const rows = draft
          .filter((c) => c.bucket === b && !c.archived)
          .sort((a, b) => a.order - b.order);
        const allocated = rows.reduce((s, c) => s + c.limit, 0);
        const gap = (budget?.buckets[b] ?? 0) - allocated;
        return (
          <div className="manage-group" key={b}>
            <button
              className="manage-group-toggle"
              aria-expanded={open === b}
              onClick={() => setOpen(open === b ? null : b)}
            >
              <BucketIcon bucket={b} />
              <div className="flex-1">
                <strong>{META[b].label}</strong>
                <span className={gap < 0 ? "danger-text" : "muted"}>
                  {gap < 0
                    ? `${money(-gap)} over bucket budget`
                    : `${money(gap)} unallocated`}
                </span>
              </div>
              <Icon
                name={open === b ? "ChevronDown" : "ChevronRight"}
                size={17}
              />
            </button>
            {open === b && (
              <div>
                {rows.map((c, i) => (
                  <div className="manage-category" key={c.id}>
                    {editing === c.id ? (
                      <div className="category-edit-form">
                        <label className="field-label" htmlFor={`name-${c.id}`}>
                          Subcategory name
                        </label>
                        <input
                          autoFocus
                          id={`name-${c.id}`}
                          value={name}
                          maxLength={50}
                          onChange={(e) => setName(e.target.value)}
                        />
                        <label
                          className="field-label"
                          htmlFor={`limit-${c.id}`}
                        >
                          Monthly limit (₹)
                        </label>
                        <input
                          id={`limit-${c.id}`}
                          inputMode="decimal"
                          value={limit}
                          onChange={(e) => setLimit(e.target.value)}
                        />
                        <label className="field-label">Choose an icon</label>
                        <div className="icon-picker">
                          {ICON_OPTIONS.map((n) => (
                            <button
                              aria-label={n}
                              aria-pressed={icon === n}
                              className={icon === n ? "selected" : ""}
                              key={n}
                              onClick={() => setIcon(n)}
                            >
                              <Icon name={n} />
                            </button>
                          ))}
                        </div>
                        <div className="form-actions compact">
                          <button
                            className="button secondary"
                            onClick={cancelEdit}
                          >
                            Cancel edit
                          </button>
                          <button
                            className="button primary"
                            disabled={
                              !name.trim() ||
                              !Number.isFinite(parseMoney(limit || "0"))
                            }
                            onClick={apply}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="manage-category-row">
                          <BucketIcon bucket={b} name={c.icon} />
                          <button
                            className="manage-category-name"
                            onClick={() => edit(c)}
                          >
                            <strong>{c.name}</strong>
                            <span>{money(c.limit)} / month</span>
                          </button>
                          <div className="reorder-buttons">
                            <button
                              className="icon-button"
                              disabled={i === 0}
                              aria-label={`Move ${c.name} up`}
                              onClick={() => reorder(c, -1)}
                            >
                              <Icon name="ArrowUp" size={15} />
                            </button>
                            <button
                              className="icon-button"
                              disabled={i === rows.length - 1}
                              aria-label={`Move ${c.name} down`}
                              onClick={() => reorder(c, 1)}
                            >
                              <Icon name="ArrowDown" size={15} />
                            </button>
                          </div>
                          <button
                            className="icon-button"
                            aria-label={`Edit ${c.name}`}
                            onClick={() => edit(c)}
                          >
                            <Icon name="Pencil" size={16} />
                          </button>
                          <button
                            className="icon-button danger-text"
                            aria-label={`Delete ${c.name}`}
                            onClick={() => setDeleting(c.id)}
                          >
                            <Icon name="Trash2" size={16} />
                          </button>
                        </div>
                        {deleting === c.id && (
                          <div className="delete-category-confirm">
                            <p>
                              Remove {c.name}? Existing transactions and past
                              budgets are kept.
                            </p>
                            <button
                              className="text-button danger-text"
                              onClick={() => {
                                setDraft((s) =>
                                  s.map((x) =>
                                    x.id === c.id
                                      ? { ...x, archived: true }
                                      : x,
                                  ),
                                );
                                setDeleting(null);
                              }}
                            >
                              Remove
                            </button>
                            <button
                              className="text-button"
                              onClick={() => setDeleting(null)}
                            >
                              Keep it
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                <button
                  className="text-button add-category"
                  disabled={!!editing}
                  onClick={() => add(b)}
                >
                  <Icon name="Plus" size={16} />
                  Add subcategory
                </button>
              </div>
            )}
          </div>
        );
      })}
      <div className="form-actions sticky-actions">
        <button className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="button primary flex-1"
          disabled={busy || !!editing}
          onClick={save}
        >
          {busy ? "Saving…" : "Save subcategories"}
        </button>
      </div>
      {editing && (
        <p className="field-hint">
          Apply or cancel the subcategory edit before saving.
        </p>
      )}
    </Modal>
  );
}
