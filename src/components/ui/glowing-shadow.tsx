import { useEffect, useRef } from "react";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { cn } from "@/utils/cn";
import "./glowing-shadow.css";

type GlowingShadowProps = ComponentPropsWithoutRef<"button"> & {
  accent?: string;
  phase?: number;
};

/** The supplied glowing-shadow effect, adapted to Vite and an accessible button.
 * Keep the glow in the category palette rather than cycling through all hues.
 */
export function GlowingShadow({
  children,
  className,
  style,
  accent = "#4F46E5",
  phase = 0,
  onPointerMove,
  onPointerLeave,
  ...props
}: GlowingShadowProps) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let intersecting = true;
    const update = () =>
      node.style.setProperty(
        "--glow-play",
        intersecting && !document.hidden ? "running" : "paused",
      );
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      update();
    });
    observer.observe(node);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return (
    <button
      {...props}
      ref={ref}
      type={props.type ?? "button"}
      className={cn("glow-container", className)}
      style={
        {
          "--glow-accent": accent,
          "--glow-phase": `${phase}s`,
          ...style,
        } as CSSProperties
      }
      onPointerMove={(event) => {
        if (event.pointerType === "mouse") {
          const box = event.currentTarget.getBoundingClientRect();
          event.currentTarget.style.setProperty(
            "--glow-x",
            `${event.clientX - box.left}px`,
          );
          event.currentTarget.style.setProperty(
            "--glow-y",
            `${event.clientY - box.top}px`,
          );
        }
        onPointerMove?.(event);
      }}
      onPointerLeave={(event) => {
        event.currentTarget.style.removeProperty("--glow-x");
        event.currentTarget.style.removeProperty("--glow-y");
        onPointerLeave?.(event);
      }}
    >
      <span className="glow" aria-hidden="true" />
      {children}
    </button>
  );
}
