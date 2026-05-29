"use client";

import { Html } from "@react-three/drei";
import type { District } from "@/lib/types";
import { useStore } from "@/lib/store";

export function DistrictLabels({ districts }: { districts: District[] }) {
  const setDistrictFilter = useStore((s) => s.setDistrictFilter);
  const districtFilter = useStore((s) => s.districtFilter);

  return (
    <>
      {districts.map((d) => (
        <Html
          key={d.id}
          position={[d.center[0], 64, d.center[2]]}
          center
          distanceFactor={120}
          zIndexRange={[30, 0]}
        >
          <button
            onClick={() =>
              setDistrictFilter(districtFilter === d.id ? null : d.id)
            }
            className="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide backdrop-blur transition-colors duration-200"
            style={{
              borderColor: d.color + "80",
              background: "#1E293Bcc",
              color: districtFilter === d.id ? "#F8FAFC" : "#94A3B8",
            }}
            aria-pressed={districtFilter === d.id}
            aria-label={`Filter to ${d.label} district (${d.memberIds.length} repos)`}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: d.color }}
            />
            {d.label}
            <span className="opacity-60">{d.memberIds.length}</span>
          </button>
        </Html>
      ))}
    </>
  );
}
