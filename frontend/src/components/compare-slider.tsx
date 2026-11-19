/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { ArrowLeftRight, Columns2, SlidersHorizontal } from "lucide-react";

interface CompareViewerProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel: string;
  afterLabel: string;
  allowSlider?: boolean;
}

export function CompareViewer({
  beforeSrc,
  afterSrc,
  beforeLabel,
  afterLabel,
  allowSlider = true,
}: CompareViewerProps) {
  const [mode, setMode] = useState<"slider" | "side">(
    allowSlider ? "slider" : "side"
  );
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(2, Math.min(98, pct)));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="space-y-3">
      {allowSlider && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {mode === "slider"
              ? "Drag handle left or right to verify zero visible difference"
              : "Side-by-side comparison of original and output image"}
          </p>
          <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5">
            <button
              type="button"
              onClick={() => setMode("slider")}
              className={`pressable inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                mode === "slider"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Slider
            </button>
            <button
              type="button"
              onClick={() => setMode("side")}
              className={`pressable inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                mode === "side"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              Side by side
            </button>
          </div>
        </div>
      )}

      {mode === "slider" && allowSlider ? (
        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          role="slider"
          aria-label="Before and after image comparison slider"
          aria-valuemin={2}
          aria-valuemax={98}
          aria-valuenow={Math.round(position)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setPosition((p) => Math.max(2, p - 4));
            if (e.key === "ArrowRight") setPosition((p) => Math.min(98, p + 4));
          }}
          className="relative select-none overflow-hidden rounded-xl border border-border bg-muted/40 cursor-ew-resize"
        >
          {/* After image (full base layer) */}
          <img
            src={afterSrc}
            alt={afterLabel}
            draggable={false}
            className="block w-full max-h-[380px] object-contain mx-auto"
          />

          {/* Before image clipped smoothly with hardware-accelerated clip-path */}
          <img
            src={beforeSrc}
            alt={beforeLabel}
            draggable={false}
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          />

          {/* Labels */}
          <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-background/85 px-2.5 py-1 text-xs font-medium text-foreground border border-border/80">
            {beforeLabel}
          </span>
          <span className="pointer-events-none absolute right-3 top-3 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
            {afterLabel}
          </span>

          {/* Vertical divider + handle */}
          <div
            style={{ left: `${position}%` }}
            className="pointer-events-none absolute inset-y-0 -translate-x-1/2 flex items-center"
          >
            <div className="h-full w-0.5 bg-primary shadow-sm" />
            <div className="absolute left-1/2 -translate-x-1/2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary bg-background text-primary shadow-md">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {beforeLabel}
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-muted/35 p-2">
              <img
                src={beforeSrc}
                alt={beforeLabel}
                className="w-full max-h-64 rounded-lg object-contain mx-auto"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">
                {afterLabel}
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-primary/35 bg-muted/35 p-2">
              <img
                src={afterSrc}
                alt={afterLabel}
                className="w-full max-h-64 rounded-lg object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
