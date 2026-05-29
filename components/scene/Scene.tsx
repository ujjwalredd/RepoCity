"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { City } from "./City";
import { CameraRig } from "./CameraRig";
import { Effects } from "./Effects";
import { Sky } from "./Sky";
import { Particles } from "./Particles";

export default function Scene() {
  const graph = useStore((s) => s.graph);
  const reducedMotion = useStore((s) => s.reducedMotion);
  const select = useStore((s) => s.select);

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ position: [85, 65, 85], fov: 42, near: 0.1, far: 1200 }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={["#02030A"]} />
      <fog attach="fog" args={["#060B1A", 160, 720]} />
      <Sky />

      {/* night lighting: dim ambient so facades stay dark + windows glow */}
      <ambientLight intensity={0.24} color="#5B7CA8" />
      <hemisphereLight args={["#24456E", "#05070D", 0.4]} />
      <directionalLight
        position={[60, 90, 40]}
        intensity={0.75}
        color="#AFC6E8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
        shadow-bias={-0.0004}
      />

      <Suspense fallback={null}>{graph && <City graph={graph} />}</Suspense>
      <Particles count={140} />

      <CameraRig />
      <Effects />
    </Canvas>
  );
}
