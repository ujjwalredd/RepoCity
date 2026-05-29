"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import gsap from "gsap";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useStore } from "@/lib/store";

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const selectedId = useStore((s) => s.selectedId);
  const graph = useStore((s) => s.graph);
  const reducedMotion = useStore((s) => s.reducedMotion);
  const introDone = useRef(false);

  // cinematic intro: sweep in from high & wide once the graph loads
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !graph || introDone.current) return;
    introDone.current = true;
    if (reducedMotion) return;
    camera.position.set(190, 140, 190);
    controls.target.set(0, 10, 0);
    controls.update();
    gsap.to(camera.position, {
      x: 85,
      y: 65,
      z: 85,
      duration: 2.6,
      ease: "power2.inOut",
      onUpdate: () => controls.update(),
    });
    gsap.to(controls.target, {
      x: 0,
      y: 6,
      z: 0,
      duration: 2.6,
      ease: "power2.inOut",
      onUpdate: () => controls.update(),
    });
  }, [graph, camera, reducedMotion]);

  // fly camera to the selected building
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !graph) return;
    const repo = graph.repos.find((r) => r.id === selectedId);
    if (!repo) return;

    const [x, , z] = repo.pos;
    const targetTo = new THREE.Vector3(x, repo.height / 2, z);
    const camTo = new THREE.Vector3(x + 14, repo.height + 16, z + 14);

    if (reducedMotion) {
      camera.position.copy(camTo);
      controls.target.copy(targetTo);
      controls.update();
      return;
    }
    gsap.to(camera.position, {
      x: camTo.x,
      y: camTo.y,
      z: camTo.z,
      duration: 1.1,
      ease: "power3.inOut",
      onUpdate: () => controls.update(),
    });
    gsap.to(controls.target, {
      x: targetTo.x,
      y: targetTo.y,
      z: targetTo.z,
      duration: 1.1,
      ease: "power3.inOut",
      onUpdate: () => controls.update(),
    });
  }, [selectedId, graph, camera, reducedMotion]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={8}
      maxDistance={200}
      maxPolarAngle={Math.PI / 2.15}
      autoRotate={!reducedMotion && !selectedId}
      autoRotateSpeed={0.25}
    />
  );
}
