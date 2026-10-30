import { useRef, useState } from "react";
import type { Theme } from "../types";
import type { Backup } from "../utils/backup";
import type { usePWA } from "../hooks/usePWA";
import { useStore } from "../store/useStore";
import { db } from "../db";
import {
  makeBackup,
  download,
  restoreBackup,
  toCSV,
  validateBackup,
} from "../utils/backup";
import { localDate, monthKey } from "../utils/dates";
import { money } from "../utils/money";
import { Icon, Logo, Modal, useFeedback } from "../components/UI";
export function Settings({
  onBudget,
  onManage,
  pwa,
}: {
  onBudget: () => void;
  onManage: () => void;
  pwa: ReturnType<typeof usePWA>;
}) {
  const { settings, refresh, reset, demo } = useStore();
  const { toast, run } = useFeedback();
  const [dialog, setDialog] = useState<"reset" | "demo" | "import" | null>(
    null,
  );
  const [resetStep, setResetStep] = useState(1);
  const [resetText, setResetText] = useState("");
  const [backup, setBackup] = useState<Backup | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  if (!settings) return null;
  const prefs = (values: Partial<typeof settings>) =>
    void run(async () => {
      await db.settings.update(1, values);
      await refresh();
    });
  const exportData = (format: "json" | "csv") =>
    void run(async () => {
      const data = await makeBackup();
      download(
        format === "json" ? JSON.stringify(data, null, 2) : toCSV(data),
        `spendlens-${localDate()}.${format}`,
        format === "json" ? "application/json" : "text/csv;charset=utf-8",
      );
      toast(`${format.toUpperCase()} export ready.`);
    });
  const chooseImport = (file?: File) =>
    void run(async () => {
      if (!file) return;
      if (file.size > 20 * 1024 * 1024)
        throw new Error("Choose a backup smaller than 20 MB.");
      let json: unknown;
      try {
        json = JSON.parse(await file.text());
      } catch {
        throw new Error("That file is not valid JSON. No data was changed.");
      }
      setBackup(validateBackup(json));
      setDialog("import");
    });
  const execute = () =>
    void run(async () => {
      setBusy(true);
      try {
        if (dialog === "reset") {
          await reset();
          toast("All local data has been reset.");
        } else if (dialog === "demo") {
          await demo();
          toast("Demo data loaded. Take a look around!");
        } else if (dialog === "import" && backup) {
          await restoreBackup(backup);
          await refresh();
          await useStore.getState().ensureMonth(monthKey());
          toast("Your backup has been restored.");
        }
        setDialog(null);
      } finally {
        setBusy(false);
      }
    });
  const reminder = () =>
    void run(async () => {
      if (settings.reminderTime) {
        await db.settings.update(1, { reminderTime: null });
        await refresh();
        return;
      }
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        toast("Reminders aren’t supported in this browser.", undefined, true);
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast(
          "Allow notifications in your browser settings to enable reminders.",
          undefined,
          true,
        );
        return;
      }
      await db.settings.update(1, { reminderTime: "20:00" });
      await refresh();
      toast("Daily check-in enabled while SpendLens is open.");
    });
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">MAKE YOURSELF AT HOME</span>
        <h1>
          Just the way you like<span>.</span>
        </h1>
        <p>Your plan. Your preferences. Your privacy.</p>
      </div>
      <section className="card settings-section">
        <h2>Your monthly plan</h2>
        <button className="settings-row" onClick={onBudget}>
          <span className="settings-icon">
            <Icon name="Banknote" />
          </span>
          <div>
            <strong>Salary & budget split</strong>
            <span>
              {money(settings.salary)} · {settings.needsPct}/{settings.wantsPct}
              /{settings.savingsPct}
            </span>
          </div>
          <Icon name="ChevronRight" size={17} />
        </button>
        <button className="settings-row" onClick={onManage}>
          <span className="settings-icon">
            <Icon name="SlidersHorizontal" />
          </span>
          <div>
            <strong>Manage subcategories</strong>
            <span>Set limits, choose icons, make it yours</span>
          </div>
          <Icon name="ChevronRight" size={17} />
        </button>
      </section>
      <section className="card settings-section">
        <h2>A little more you</h2>
        <div className="settings-label">
          <Icon name="Sun" size={20} />
          <strong>Appearance</strong>
        </div>
        <div className="segmented theme-toggle">
          {(["system", "light", "dark"] as Theme[]).map((t) => (
            <button
              key={t}
              aria-pressed={settings.theme === t}
              className={settings.theme === t ? "active" : ""}
              onClick={() => prefs({ theme: t })}
            >
              <Icon
                name={
                  t === "system" ? "Settings" : t === "light" ? "Sun" : "Moon"
                }
                size={15}
              />
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="settings-row reminder-row">
          <span className="settings-icon">
            <Icon name="Bell" />
          </span>
          <div>
            <strong>Daily check-in</strong>
            <span>A gentle nudge to log your day</span>
          </div>
          <button
            className={`switch ${settings.reminderTime ? "on" : ""}`}
            role="switch"
            aria-checked={!!settings.reminderTime}
            aria-label="Daily reminder"
            onClick={reminder}
          >
            <span />
          </button>
        </div>
        {settings.reminderTime && (
          <label className="reminder-time">
            Remind me at
            <input
              aria-label="Reminder time"
              type="time"
              value={settings.reminderTime}
              onChange={(e) => {
                if (e.target.value) prefs({ reminderTime: e.target.value });
              }}
            />
          </label>
        )}
        <p className="field-hint reminder-hint">
          Notifications run while the app is open. Browsers can’t reliably
          schedule a local reminder when the app is closed.
        </p>
      </section>
      <section className="card settings-section">
        <h2>Your data, in your hands</h2>
        <button className="settings-row" onClick={() => exportData("json")}>
          <span className="settings-icon">
            <Icon name="Download" />
          </span>
          <div>
            <strong>Export JSON backup</strong>
            <span>Budgets, preferences & every transaction</span>
          </div>
          <Icon name="ArrowUpRight" size={17} />
        </button>
        <button className="settings-row" onClick={() => exportData("csv")}>
          <span className="settings-icon">
            <Icon name="ChartNoAxesCombined" />
          </span>
          <div>
            <strong>Export transactions as CSV</strong>
            <span>For your spreadsheet moments</span>
          </div>
          <Icon name="ArrowUpRight" size={17} />
        </button>
        <button className="settings-row" onClick={() => input.current?.click()}>
          <span className="settings-icon">
            <Icon name="Upload" />
          </span>
          <div>
            <strong>Import JSON backup</strong>
            <span>Pick up where you left off</span>
          </div>
          <Icon name="ChevronRight" size={17} />
        </button>
        <input
          type="file"
          accept=".json,application/json"
          className="sr-only"
          aria-label="Import JSON file"
          ref={input}
          onChange={(e) => {
            chooseImport(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button className="settings-row" onClick={() => setDialog("demo")}>
          <span className="settings-icon demo-icon">
            <Icon name="Sparkles" />
          </span>
          <div>
            <strong>Load demo data</strong>
            <span>A little preview of what’s possible</span>
          </div>
          <Icon name="ChevronRight" size={17} />
        </button>
      </section>
      <section className="card settings-section install-section">
        <div className="settings-label">
          <img src="/logo.svg" alt="" />
          <div>
            <h2>Clarity, one tap away</h2>
            <p className="muted">Keep SpendLens on your home screen.</p>
          </div>
        </div>
        {pwa.installed ? (
          <p className="balanced inline-label">
            <Icon name="Check" size={17} /> SpendLens is installed
          </p>
        ) : pwa.canInstall ? (
          <button
            className="button primary"
            onClick={() => void run(pwa.install)}
          >
            <Icon name="Download" size={17} />
            Install app
          </button>
        ) : (
          <p className="field-hint">
            {pwa.isIOS
              ? "On Safari, tap Share → Add to Home Screen."
              : "Use your browser menu → Install app or Add to Home Screen when available."}
          </p>
        )}
        <p className="micro muted">
          iPhone & iPad: Safari → Share → Add to Home Screen.
        </p>
        {pwa.needRefresh && (
          <button
            className="button secondary"
            onClick={() => void pwa.update()}
          >
            Update SpendLens
          </button>
        )}
      </section>
      <section className="privacy-card">
        <Icon name="ShieldCheck" size={27} />
        <h2>Private. By design.</h2>
        <p>
          No bank access. No SMS reading. No account.
          <br />
          Your data stays on your phone.
        </p>
        <p className="field-hint">
          SpendLens stores your entries in this browser’s IndexedDB. No
          analytics, no trackers, no backend. Export a backup before clearing
          browser data or changing devices.
        </p>
      </section>
      <button
        className="reset-button"
        onClick={() => {
          setResetStep(1);
          setResetText("");
          setDialog("reset");
        }}
      >
        <Icon name="Trash2" size={17} />
        Reset all data
      </button>
      <div className="about">
        <Logo small />
        <p>See every rupee. Keep more of it.</p>
        <span>VERSION 1.0.0 · MADE FOR A LITTLE MORE PEACE OF MIND</span>
      </div>
      {dialog && (
        <Modal
          title={
            dialog === "demo"
              ? "Try a clearer picture"
              : dialog === "import"
                ? "Restore your backup"
                : resetStep === 1
                  ? "A completely fresh start?"
                  : "One last check"
          }
          onClose={() => {
            if (!busy) setDialog(null);
          }}
        >
          {dialog === "demo" ? (
            <p className="dialog-copy">
              This replaces your current data with a ₹70,000 salary, subcategory
              budgets, and two months of sample transactions. Export a JSON
              backup first if you want to keep your current data.
            </p>
          ) : dialog === "import" ? (
            <p className="dialog-copy">
              Replace all current data with this backup? It contains{" "}
              {backup?.transactions.length} transactions and{" "}
              {backup?.monthlyBudgets.length} monthly budgets. Export your
              current data first if you want to keep it.
            </p>
          ) : resetStep === 1 ? (
            <p className="dialog-copy">
              This will permanently delete every transaction, budget and
              preference on this device. Export a JSON backup first if you want
              to keep a copy.
            </p>
          ) : (
            <>
              <p className="dialog-copy">
                This cannot be undone. Type <strong>RESET</strong> to
                permanently erase your SpendLens data.
              </p>
              <input
                aria-label="Type RESET to confirm"
                placeholder="RESET"
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
              />
            </>
          )}
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setDialog(null)}
            >
              Cancel
            </button>
            <button
              className={`button flex-1 ${dialog === "reset" ? "destructive" : "primary"}`}
              disabled={
                busy ||
                (dialog === "reset" && resetStep === 2 && resetText !== "RESET")
              }
              onClick={() =>
                dialog === "reset" && resetStep === 1
                  ? setResetStep(2)
                  : execute()
              }
            >
              {busy
                ? "Working…"
                : dialog === "demo"
                  ? "Load demo data"
                  : dialog === "import"
                    ? "Restore backup"
                    : resetStep === 1
                      ? "Continue to reset"
                      : "Delete everything"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
