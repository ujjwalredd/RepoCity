"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@/lib/store";

// Slow-drifting light dust for atmospheric depth. One subtle system — kept
// minimal per the "animate 1–2 things" guidance. Frozen under reduced-motion.
export function Particles({ count = 280, extent = 180 }: { count?: number; extent?: number }) {
  const ref = useRef<THREE.Points>(null);
  const reducedMotion = useStore((s) => s.reducedMotion);

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * extent * 2;
      positions[i * 3 + 1] = Math.random() * 80 + 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * extent * 2;
      speeds[i] = 0.4 + Math.random() * 1.2;
    }
    return { positions, speeds };
  }, [count, extent]);

  useFrame((_, dt) => {
    if (reducedMotion || !ref.current) return;
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * dt;
      if (arr[i * 3 + 1] > 84) arr[i * 3 + 1] = 2;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        color="#7FB4E8"
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
