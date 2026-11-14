import React, { useEffect, useRef } from "react";

export const InteractiveBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetX = useRef<number>(window.innerWidth / 2);
  const targetY = useRef<number>(window.innerHeight / 3);
  const currentX = useRef<number>(window.innerWidth / 2);
  const currentY = useRef<number>(window.innerHeight / 3);
  const animFrameId = useRef<number>(0);
  const isVisible = useRef<boolean>(true);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    // Detect touch device
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    const handlePointerMove = (e: PointerEvent) => {
      targetX.current = e.clientX;
      targetY.current = e.clientY;
    };

    const handleVisibilityChange = () => {
      isVisible.current = document.visibilityState === "visible";
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const lerp = (start: number, end: number, factor: number) =>
      start + (end - start) * factor;

    const render = () => {
      if (isVisible.current && containerRef.current) {
        // Smooth lerp easing
        currentX.current = lerp(currentX.current, targetX.current, 0.08);
        currentY.current = lerp(currentY.current, targetY.current, 0.08);

        containerRef.current.style.setProperty(
          "--spotlight-x",
          `${Math.round(currentX.current)}px`
        );
        containerRef.current.style.setProperty(
          "--spotlight-y",
          `${Math.round(currentY.current)}px`
        );
      }
      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelAnimationFrame(animFrameId.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        background: `
          radial-gradient(
            800px circle at var(--spotlight-x, 50%) var(--spotlight-y, 30%),
            rgba(39, 56, 105, 0.04),
            transparent 70%
          ),
          #EDF1F4
        `,
      }}
    >
      {/* Fine architectural hairline dot-grid */}
      <div
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage: `radial-gradient(rgba(64, 88, 129, 0.25) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Subtle single-region navy mesh gradient strictly restrained behind top hero area */}
      <div
        className="absolute -top-[25%] left-1/2 -translate-x-1/2 w-[900px] h-[550px] rounded-full blur-[110px] opacity-[0.12] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, #273869 0%, #405881 60%, transparent 100%)",
        }}
      />
    </div>
  );
};

