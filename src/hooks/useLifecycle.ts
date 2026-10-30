import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { db } from "../db";
import { localDate, monthKey } from "../utils/dates";
export function useLifecycle() {
  const theme = useStore((s) => s.settings?.theme ?? "system");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    let checking = false;
    const check = async () => {
      if (checking || !useStore.getState().settings) return;
      checking = true;
      try {
        await useStore.getState().ensureMonth(monthKey());
        const s = useStore.getState().settings;
        if (
          !s?.reminderTime ||
          !("Notification" in window) ||
          Notification.permission !== "granted"
        )
          return;
        const today = localDate();
        const now = new Date();
        const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        if (
          clock >= s.reminderTime &&
          s.reminderLastDate !== today &&
          document.visibilityState === "visible"
        ) {
          const reg = await navigator.serviceWorker?.getRegistration();
          if (reg) {
            await reg.showNotification("A little check-in from SpendLens", {
              body: "Bring today into focus. Take a moment to log your expenses.",
              icon: "/icon-192.png",
              tag: "spendlens-daily",
            });
            await db.settings.update(1, { reminderLastDate: today });
            await useStore.getState().refresh();
          }
        }
      } catch (error) {
        console.error("Daily check-in failed", error);
      } finally {
        checking = false;
      }
    };
    const timer = setInterval(() => void check(), 20000);
    const visible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", visible);
    void check();
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
}
