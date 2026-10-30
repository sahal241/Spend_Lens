import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Bell,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Coffee,
  Download,
  Ellipsis,
  Gift,
  Gem,
  HeartPulse,
  House,
  Landmark,
  Lightbulb,
  LockKeyhole,
  Menu,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Smile,
  Sofa,
  Sparkles,
  Sprout,
  Sun,
  TrainFront,
  Trash2,
  TrendingUp,
  Upload,
  Utensils,
  Wallet,
  WifiOff,
  X,
  Tv,
  ArrowUp,
  ArrowDown,
  CircleHelp,
} from "lucide-react";
import type { Bucket } from "../types";
import { META } from "../types";
import { money, status } from "../utils/money";
import { monthKey, monthLabel, moveMonth } from "../utils/dates";
const icons = {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Bell,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Coffee,
  Download,
  Ellipsis,
  Gift,
  Gem,
  HeartPulse,
  House,
  Landmark,
  Lightbulb,
  LockKeyhole,
  Menu,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Smile,
  Sofa,
  Sparkles,
  Sprout,
  Sun,
  TrainFront,
  Trash2,
  TrendingUp,
  Upload,
  Utensils,
  Wallet,
  WifiOff,
  X,
  Tv,
  ArrowUp,
  ArrowDown,
  CircleHelp,
};
export const ICON_OPTIONS = [
  "House",
  "Utensils",
  "TrainFront",
  "Repeat",
  "Sofa",
  "Lightbulb",
  "HeartPulse",
  "Landmark",
  "ShoppingBag",
  "Coffee",
  "Clapperboard",
  "Tv",
  "Smile",
  "Gift",
  "ChartNoAxesCombined",
  "ShieldCheck",
  "Gem",
  "Sprout",
  "Wallet",
  "Banknote",
  "Sparkles",
];
export function Icon({
  name,
  size = 20,
  ...rest
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const C = icons[name as keyof typeof icons] ?? Wallet;
  return <C size={size} strokeWidth={1.8} aria-hidden="true" {...rest} />;
}
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "small" : ""}`}>
      <img src="/logo.svg" alt="" />
      <span>
        Spend<span className="brand-lens">Lens</span>
        <span className="brand-dot">.</span>
      </span>
    </div>
  );
}
export function BucketIcon({
  bucket,
  name,
}: {
  bucket: Bucket;
  name?: string;
}) {
  return (
    <span className={`category-icon ${bucket}`}>
      <Icon name={name ?? META[bucket].icon} />
    </span>
  );
}
export function Progress({
  spent,
  limit,
  bucket,
}: {
  spent: number;
  limit: number;
  bucket: Bucket;
}) {
  const state = status(spent, limit);
  const pct =
    limit > 0 ? Math.min(100, (spent / limit) * 100) : spent > 0 ? 100 : 0;
  return (
    <div
      className={`progress ${state}`}
      role="progressbar"
      aria-label={`${META[bucket].label} budget used`}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        style={{
          width: `${pct}%`,
          background: state === "normal" ? META[bucket].color : undefined,
        }}
      />
    </div>
  );
}
export function Empty({
  title = "A fresh start.",
  text = "Your transactions will appear here. Add your first expense to bring your money into focus.",
  icon = "Wallet",
}: {
  title?: string;
  text?: string;
  icon?: string;
}) {
  return (
    <div className="empty">
      <div className="empty-art">
        <Icon name={icon} size={30} />
        <span>✦</span>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function MonthNav({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="month-nav">
      <button
        className="icon-button"
        aria-label="Previous month"
        onClick={() => onChange(moveMonth(value, -1))}
      >
        <Icon name="ChevronLeft" />
      </button>
      <div>
        <strong>{monthLabel(value)}</strong>
        {value === monthKey() && <span>This month</span>}
      </div>
      <button
        className="icon-button"
        aria-label="Next month"
        disabled={value >= monthKey()}
        onClick={() => onChange(moveMonth(value, 1))}
      >
        <Icon name="ChevronRight" />
      </button>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = ref.current!;
    const focusable = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      );
    const auto = node.querySelector<HTMLElement>("[data-autofocus]");
    (auto ?? focusable()[0])?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const all = focusable();
        const first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      old?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`sheet ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <div className="sheet-handle" />
        <header className="sheet-header">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <Icon name="X" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
interface Notice {
  id: number;
  text: string;
  action?: { label: string; run: () => void | Promise<void> };
  warning?: boolean;
}
const Context = createContext<{
  toast: (text: string, action?: Notice["action"], warning?: boolean) => void;
  run: (action: () => Promise<void>) => Promise<void>;
}>({ toast: () => {}, run: async () => {} });
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const toast = (text: string, action?: Notice["action"], warning = false) => {
    const id = Date.now() + Math.random();
    setNotices((s) => [...s.slice(-2), { id, text, action, warning }]);
    timers.current.push(
      setTimeout(
        () => setNotices((s) => s.filter((n) => n.id !== id)),
        action ? 10000 : 6000,
      ),
    );
  };
  const run = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (e) {
      console.error(e);
      toast(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
        undefined,
        true,
      );
    }
  };
  return (
    <Context.Provider value={{ toast, run }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {notices.map((n) => (
          <div key={n.id} className={`toast ${n.warning ? "warning" : ""}`}>
            <Icon name={n.warning ? "CircleHelp" : "Check"} size={18} />
            <span>{n.text}</span>
            {n.action && (
              <button
                onClick={() => {
                  setNotices((s) => s.filter((x) => x.id !== n.id));
                  void run(async () => {
                    await n.action!.run();
                  });
                }}
              >
                {n.action.label}
              </button>
            )}
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotices((s) => s.filter((x) => x.id !== n.id))}
            >
              <Icon name="X" size={16} />
            </button>
          </div>
        ))}
      </div>
    </Context.Provider>
  );
}
export const useFeedback = () => useContext(Context);
export function RemainingText({
  spent,
  limit,
}: {
  spent: number;
  limit: number;
}) {
  return spent > limit ? (
    <span className="danger-text">Over by {money(spent - limit)}</span>
  ) : (
    <span>
      {money(limit - spent)}{" "}
      <span className="muted">left of {money(limit)}</span>
    </span>
  );
}
