"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "@/lib/store";

interface Props {
  a: [number, number, number];
  b: [number, number, number];
  weight: number;
  active: boolean;
  dimmed: boolean;
  /** same-cluster link → tinted with district color; cross-cluster → bright bridge */
  intra: boolean;
  color: string;
  aLabel: string;
  bLabel: string;
}

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uActive;
  uniform float uFlow;
  varying vec2 vUv;
  void main() {
    vec3 col = mix(uColorA, uColorB, vUv.x);
    float speed = 0.35 + uActive * 0.6;
    float pulse = fract(vUv.x - uTime * speed * uFlow);
    float band = smoothstep(0.0, 0.08, pulse) * (1.0 - smoothstep(0.12, 0.45, pulse));
    float glow = uOpacity + band * (0.35 + uActive * 0.9);
    col += band * uActive * 0.6;
    gl_FragColor = vec4(col, glow);
  }
`;

export function Arc({ a, b, weight, active, dimmed, intra, color, aLabel, bLabel }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const reducedMotion = useStore((s) => s.reducedMotion);
  const [hovered, setHovered] = useState(false);

  const { geom, pickGeom, mid } = useMemo(() => {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const midV = start.clone().add(end).multiplyScalar(0.5);
    const dist = start.distanceTo(end);
    midV.y += Math.min(22, 4 + dist * 0.3);
    const curve = new THREE.QuadraticBezierCurve3(start, midV, end);
    const radius = 0.06 + weight * 0.18;
    return {
      geom: new THREE.TubeGeometry(curve, 44, radius, 8, false),
      pickGeom: new THREE.TubeGeometry(curve, 20, 0.45, 5, false),
      mid: curve.getPoint(0.5),
    };
  }, [a, b, weight]);

  // cross-cluster bridges glow cyan→indigo; intra-cluster links take the
  // district hue so neighborhoods read as cohesive blocks
  const colors = useMemo(() => {
    if (intra) {
      const c = new THREE.Color(color);
      return { A: c.clone().multiplyScalar(1.1), B: c.clone().lerp(new THREE.Color("#ffffff"), 0.25) };
    }
    return { A: new THREE.Color("#38BDF8"), B: new THREE.Color("#818CF8") };
  }, [intra, color]);

  const uniforms = useMemo(
    () => ({
      uColorA: { value: colors.A },
      uColorB: { value: colors.B },
      uTime: { value: 0 },
      uOpacity: { value: 0.12 },
      uActive: { value: 0 },
      uFlow: { value: reducedMotion ? 0 : 1 },
    }),
    [colors, reducedMotion],
  );

  useFrame((_, dt) => {
    const m = matRef.current;
    if (!m) return;
    if (!reducedMotion) m.uniforms.uTime.value += dt;
    const targetActive = active || hovered ? 1 : 0;
    m.uniforms.uActive.value += (targetActive - m.uniforms.uActive.value) * Math.min(1, dt * 8);
    // cross-cluster bridges sit a touch brighter so structure is legible
    const baseOp = dimmed ? 0.03 : (intra ? 0.08 : 0.14) + weight * 0.1;
    const targetOp = active || hovered ? 0.55 + weight * 0.4 : baseOp;
    m.uniforms.uOpacity.value += (targetOp - m.uniforms.uOpacity.value) * Math.min(1, dt * 8);
  });

  const pct = Math.round(weight * 100);

  return (
    <group>
      <mesh geometry={geom}>
        <shaderMaterial
          ref={matRef}
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* invisible thin tube for hover picking — no stopPropagation so it
          never blocks building hover/click underneath */}
      <mesh
        geometry={pickGeom}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {(hovered || active) && !dimmed && (
        <Html position={[mid.x, mid.y, mid.z]} center distanceFactor={60} zIndexRange={[45, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded-md border border-surface-2/70 bg-surface/90 px-2 py-1 text-center font-mono text-[10px] text-ink shadow-lg backdrop-blur">
            <div className="flex items-center gap-1.5">
              <span>{aLabel}</span>
              <span className="text-muted">↔</span>
              <span>{bLabel}</span>
            </div>
            <div className="mt-0.5 text-[9px] uppercase tracking-wide text-muted">
              {pct}% similar · {intra ? "same cluster" : "cross-cluster"}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
