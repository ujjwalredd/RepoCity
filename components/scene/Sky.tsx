"use client";

import { useMemo } from "react";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

// Gradient night dome (deep black zenith → midnight-blue horizon glow) drawn on
// the inside of a large sphere, plus sparse stars. Gives the skyline depth and
// a horizon to reflect, instead of a flat background color.
const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  void main() {
    float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
    // sky gradient
    vec3 col = mix(uHorizon, uTop, pow(h, 0.65));
    // warm city light-pollution glow hugging the horizon
    float band = smoothstep(0.5, 0.36, h) * smoothstep(0.18, 0.42, h);
    col += uGlow * band * 0.6;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function Sky() {
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color("#02030A") },
      uHorizon: { value: new THREE.Color("#0A1430") },
      uGlow: { value: new THREE.Color("#1E63B0") },
    }),
    [],
  );

  return (
    <group>
      <mesh>
        <sphereGeometry args={[900, 32, 16]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <Stars radius={500} depth={120} count={2600} factor={5} saturation={0} fade speed={0.3} />
    </group>
  );
}
