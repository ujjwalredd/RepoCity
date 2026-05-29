"use client";

import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  Noise,
  SMAA,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Vector2 } from "three";
import { useMemo } from "react";

// Sharp cinematic stack — NO depth-of-field (kept the whole city crisp).
// Bloom (emissive only) → very subtle chromatic aberration at the edges →
// light film grain → vignette → SMAA anti-aliasing.
export function Effects() {
  // barely-there fringe — kills the glitchy color edges on windows
  const ca = useMemo(() => new Vector2(0.00012, 0.00012), []);
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        intensity={0.95}
        luminanceThreshold={0.42}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <ChromaticAberration
        offset={ca}
        radialModulation={false}
        modulationOffset={0}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise premultiply opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
      <Vignette offset={0.32} darkness={0.8} blendFunction={BlendFunction.NORMAL} />
      <SMAA />
    </EffectComposer>
  );
}
