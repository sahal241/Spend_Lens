import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import type { ErrorInfo, ReactNode } from "react";
import type { Transaction } from "./types";
import { useStore } from "./store/useStore";
import { useLifecycle } from "./hooks/useLifecycle";
import { usePWA } from "./hooks/usePWA";
import { FeedbackProvider, Icon, Logo, Modal } from "./components/UI";
import { BudgetEditor } from "./components/BudgetEditor";
import { CategoryManager } from "./components/CategoryManager";
import { ExpenseSheet } from "./components/ExpenseSheet";
import { Home } from "./screens/Home";
import { Transactions } from "./screens/Transactions";
const Insights = lazy(() =>
  import("./screens/Insights").then((module) => ({ default: module.Insights })),
);
import { Settings } from "./screens/Settings";
import { BottomNavigation } from "./components/BottomNavigation";
import { Onboarding } from "./screens/Onboarding";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }
  render() {
    return this.state.failed ? (
      <div className="fatal-error">
        <Logo />
        <h1>Let’s try that again.</h1>
        <p>
          Your saved data is still on this device. Reload to reopen SpendLens.
        </p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload SpendLens
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function SpendLens() {
  const { ready, settings, error, init } = useStore();
  const [tab, setTab] = useState("home");
  const [sheet, setSheet] = useState<
    "expense" | "budget" | "categories" | null
  >(null);
  const [transaction, setTransaction] = useState<Transaction | undefined>();
  const [sessionMonth, setSessionMonth] = useState(new Date().getMonth());
  const pwa = usePWA();
  useLifecycle();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [!!settings]);
  useEffect(() => {
    void init();
  }, [init]);
  useEffect(() => {
    const clock = setInterval(() => {
      const month = new Date().getMonth();
      if (sessionMonth !== month) {
        setSessionMonth(month);
        setTab("home");
      }
    }, 30000);
    return () => clearInterval(clock);
  }, [sessionMonth]);
  const close = useCallback(() => {
    setSheet(null);
    setTransaction(undefined);
  }, []);
  const edit = (t: Transaction) => {
    setTransaction(t);
    setSheet("expense");
  };
  const add = () => {
    setTransaction(undefined);
    setSheet("expense");
  };
  const budget = () => setSheet("budget");
  const manage = () => setSheet("categories");
  const navigate = (next: string) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  if (!ready)
    return (
      <div className="app-loading">
        <Logo />
        <div className="loading-line" />
        <p>Bringing things into focus…</p>
      </div>
    );
  if (error)
    return (
      <div className="fatal-error">
        <Logo />
        <h1>A little storage hiccup.</h1>
        <p>{error}</p>
        <button className="button primary" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  return (
    <div className="app-shell">
      {pwa.needRefresh && (
        <div className="update-banner">
          <span>A fresh version is ready.</span>
          <button className="text-button" onClick={() => void pwa.update()}>
            Update now
          </button>
        </div>
      )}
      {!settings ? (
        <Onboarding />
      ) : (
        <>
          <header className="app-header">
            <button
              className="brand-button"
              aria-label="SpendLens home"
              onClick={() => navigate("home")}
            >
              <Logo />
            </button>
            <span className="private-badge">
              <Icon name={pwa.online ? "ShieldCheck" : "WifiOff"} size={13} />
              {pwa.online ? "PRIVATE & LOCAL" : "OFFLINE"}
            </span>
          </header>
          {!pwa.online && (
            <div className="offline-banner">
              <Icon name="WifiOff" size={14} /> You’re offline. Your entries
              still save on this device.
            </div>
          )}
          <main id="main" className="main-content" key={tab}>
            {tab === "home" ? (
              <Home
                onEdit={edit}
                onBudget={budget}
                onManage={manage}
                onTransactions={() => navigate("transactions")}
                onAdd={add}
              />
            ) : tab === "transactions" ? (
              <Transactions onEdit={edit} />
            ) : tab === "insights" ? (
              <Suspense
                fallback={
                  <div className="empty">
                    <Icon name="ChartNoAxesCombined" />
                    <p>Bringing your bigger picture into focus…</p>
                  </div>
                }
              >
                <Insights onEdit={edit} />
              </Suspense>
            ) : (
              <Settings onBudget={budget} onManage={manage} pwa={pwa} />
            )}
          </main>
          <button className="fab" aria-label="Log expense" onClick={add}>
            <Icon name="Plus" size={27} />
          </button>
          <BottomNavigation activeTab={tab} onNavigate={navigate} />
          {sheet === "expense" && (
            <ExpenseSheet transaction={transaction} onClose={close} />
          )}{" "}
          {sheet === "budget" && (
            <Modal title="Your salary. Your plan." onClose={close}>
              <BudgetEditor
                initial={settings}
                onDone={close}
                onCancel={close}
              />
            </Modal>
          )}
          {sheet === "categories" && <CategoryManager onClose={close} />}
        </>
      )}
    </div>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <FeedbackProvider>
        <SpendLens />
      </FeedbackProvider>
    </ErrorBoundary>
  );
}
