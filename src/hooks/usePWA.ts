import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function usePWA() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [installed, setInstalled] = useState(
    window.matchMedia("(display-mode: standalone)").matches,
  );
  const sw = useRegisterSW({
    immediate: true,
    onRegisterError: (error) => console.error("Offline setup failed", error),
  });
  useEffect(() => {
    const before = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const install = () => {
      setInstalled(true);
      setPrompt(null);
    };
    const network = () => setOnline(navigator.onLine);
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", install);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    return () => {
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", install);
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
    };
  }, []);
  return {
    online,
    installed,
    canInstall: !!prompt,
    isIOS: /iphone|ipad|ipod/i.test(navigator.userAgent),
    offlineReady: sw.offlineReady[0],
    needRefresh: sw.needRefresh[0],
    update: () => sw.updateServiceWorker(true),
    install: async () => {
      if (prompt) {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === "accepted") setPrompt(null);
      }
    },
  };
}
