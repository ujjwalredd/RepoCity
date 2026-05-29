"use client";

import { Grid, MeshReflectorMaterial } from "@react-three/drei";
import type { District } from "@/lib/types";
import * as THREE from "three";
import { useMemo } from "react";

export function Ground({ districts }: { districts: District[] }) {
  return (
    <group>
      {/* wet asphalt — real-time reflections of the neon skyline */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        receiveShadow
      >
        <planeGeometry args={[900, 900]} />
        <MeshReflectorMaterial
          resolution={512}
          mirror={0.5}
          mixBlur={2}
          mixStrength={1.8}
          blur={[180, 60]}
          roughness={0.9}
          depthScale={0.8}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
          color="#05070E"
          metalness={0.6}
        />
      </mesh>

      {/* street grid — subtle, fades fast so it reads as city blocks, not a blueprint */}
      <Grid
        position={[0, 0, 0]}
        args={[400, 400]}
        cellSize={7}
        cellThickness={0.4}
        cellColor="#121C30"
        sectionSize={48}
        sectionThickness={0.8}
        sectionColor="#1E3552"
        fadeDistance={130}
        fadeStrength={3}
        infiniteGrid={false}
        followCamera={false}
      />

      {/* district tinted tiles */}
      {districts.map((d) => (
        <DistrictTile key={d.id} district={d} />
      ))}
    </group>
  );
}

// soft radial glow under each district (additive, fades to nothing at the rim)
// — reads as colored light on the wet street, not a flat overlapping disc.
function DistrictTile({ district }: { district: District }) {
  const radius = useMemo(
    () => 8 + Math.sqrt(district.memberIds.length) * 4,
    [district.memberIds.length],
  );
  const texture = useMemo(() => {
    const s = 128;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    const col = new THREE.Color(district.color);
    const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
    g.addColorStop(0, `rgba(${rgb},0.55)`);
    g.addColorStop(0.5, `rgba(${rgb},0.18)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }, [district.color]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[district.center[0], 0.04, district.center[2]]}
    >
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
