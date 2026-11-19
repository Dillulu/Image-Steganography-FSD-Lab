"use client";

import { useEffect, useRef } from "react";

/**
 * Interactive Hidden-Pixel Matrix Background
 * Renders a calm optical pixel lattice with gentle ambient bit-shimmer and
 * a soft cursor-reactive reveal wave, evoking hidden pixel planes in an image.
 */
export function PixelFieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const cell = 30;
    let cols = 0;
    let rows = 0;
    let seeds: Float32Array = new Float32Array(0);

    const mouse = { x: -9999, y: -9999, active: false };
    let rafId = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(width / cell) + 1;
      rows = Math.ceil(height / cell) + 1;
      seeds = new Float32Array(cols * rows);
      for (let i = 0; i < seeds.length; i++) {
        seeds[i] = Math.sin(i * 12.9898) * 43758.5453;
        seeds[i] = seeds[i] - Math.floor(seeds[i]);
      }
    };

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const onLeave = () => {
      mouse.active = false;
    };

    const draw = (time: number) => {
      const isDark = document.documentElement.classList.contains("dark");
      ctx.clearRect(0, 0, width, height);

      // Soft top-center ambient optical wash (restrained, domain-authentic emerald/teal)
      const topGrad = ctx.createRadialGradient(
        width * 0.5,
        -height * 0.08,
        20,
        width * 0.5,
        height * 0.2,
        Math.max(width, height) * 0.68
      );
      if (isDark) {
        topGrad.addColorStop(0, "rgba(16, 185, 129, 0.16)");
        topGrad.addColorStop(0.45, "rgba(13, 148, 136, 0.06)");
        topGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        topGrad.addColorStop(0, "rgba(16, 185, 129, 0.13)");
        topGrad.addColorStop(0.45, "rgba(13, 148, 136, 0.045)");
        topGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      }
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, width, height);

      // Bottom-right subtle depth accent
      const botGrad = ctx.createRadialGradient(
        width * 0.88,
        height * 0.92,
        10,
        width * 0.88,
        height * 0.92,
        Math.max(width, height) * 0.45
      );
      if (isDark) {
        botGrad.addColorStop(0, "rgba(20, 184, 166, 0.11)");
        botGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        botGrad.addColorStop(0, "rgba(20, 184, 166, 0.08)");
        botGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      }
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle interactive pixel-plane lattice
      const t = reducedMotion ? 0 : time * 0.00055;
      const baseDot = isDark ? "rgba(148, 163, 184, 0.11)" : "rgba(15, 23, 42, 0.085)";
      const radiusSq = 185 * 185;

      for (let r = 0; r < rows; r++) {
        const y = r * cell + cell * 0.5;
        for (let c = 0; c < cols; c++) {
          const x = c * cell + cell * 0.5;
          const idx = r * cols + c;
          const s = seeds[idx];

          // Gentle ambient bit shimmer on ~12% of cells
          const wave = Math.sin(t * 2.1 + s * Math.PI * 2 + c * 0.18 + r * 0.14);
          let highlight = s > 0.88 && wave > 0.45 ? (wave - 0.45) * 0.48 : 0;

          // Cursor-reactive hidden pixel reveal
          if (mouse.active && !reducedMotion) {
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < radiusSq) {
              const proximity = 1 - Math.sqrt(d2) / 185;
              highlight = Math.max(highlight, proximity * proximity * 0.65);
            }
          }

          if (highlight > 0.02) {
            const size = 2.4 + highlight * 3.8;
            ctx.fillStyle = isDark
              ? `rgba(52, 211, 153, ${0.14 + highlight * 0.52})`
              : `rgba(5, 150, 105, ${0.12 + highlight * 0.42})`;
            ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
          } else {
            ctx.fillStyle = baseDot;
            ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
          }
        }
      }

      if (!reducedMotion) {
        rafId = window.requestAnimationFrame(draw);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    const observer = new MutationObserver(() => {
      if (reducedMotion) draw(0);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    rafId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
