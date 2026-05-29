"use client";

export function Loader({ label = "Loading city…" }: { label?: string }) {
  return (
    <div
      className="absolute inset-0 z-modal flex flex-col items-center justify-center gap-4 bg-bg"
      role="status"
      aria-live="polite"
    >
      {/* skeleton skyline */}
      <div className="flex items-end gap-1.5" aria-hidden>
        {[10, 18, 8, 24, 14, 20, 11].map((h, i) => (
          <div
            key={i}
            className="w-3 animate-pulse rounded-sm bg-surface-2"
            style={{ height: `${h * 3}px`, animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
      <p className="font-mono text-xs text-muted">{label}</p>
    </div>
  );
}
