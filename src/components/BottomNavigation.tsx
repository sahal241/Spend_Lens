import { useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import { Icon } from "./UI";
import { LiquidNavbar } from "./ui/liquid-glass-navbar";
import type { LiquidNavItem } from "./ui/liquid-glass-navbar";

const tabs = ["home", "transactions", "insights", "settings"];
const items: LiquidNavItem[] = [
  { label: "Home", icon: <Icon name="House" size={21} />, fx: "glow" },
  { label: "Transactions", icon: <Icon name="Repeat" size={21} />, fx: "spin" },
  {
    label: "Insights",
    icon: <Icon name="ChartNoAxesCombined" size={21} />,
    fx: "pop",
  },
  { label: "Settings", icon: <Icon name="Settings" size={21} />, fx: "spin" },
];

export function BottomNavigation({
  activeTab,
  onNavigate,
}: {
  activeTab: string;
  onNavigate: (tab: string) => void;
}) {
  const theme = useStore((s) => s.settings?.theme ?? "system");
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const dark = theme === "dark" || (theme === "system" && systemDark);
  return (
    <div className="bottom-nav-dock">
      <LiquidNavbar
        className="spendlens-liquid-nav"
        items={items}
        active={Math.max(0, tabs.indexOf(activeTab))}
        onChange={(index) => onNavigate(tabs[index])}
        tone={dark ? "dark" : "light"}
        compact={false}
        sound={false}
      />
    </div>
  );
}
