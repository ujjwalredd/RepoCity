"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { RepoNode } from "@/lib/types";
import { useStore } from "@/lib/store";

interface Props {
  repo: RepoNode;
  districtColor: string;
  dimmed: boolean;
  highlighted: boolean;
}

// Night-city facade: dark wall + a grid of randomly-lit windows that bloom.
// Emphasis (hover/select/query) floods the building with an accent rim glow.
const vertexShader = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vPos = position;
    vNormal = normal;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uHalfH;
  uniform float uSeed;
  uniform vec3 uFacade;
  uniform float uTime;
  uniform float uFlow;
  uniform float uEmphasis;
  uniform vec3 uHighlight;
  uniform float uOpacity;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vView;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }

  void main() {
    vec3 n = normalize(vNormal);
    bool roof = abs(n.y) > 0.5;

    // fake key light for facade depth
    float light = clamp(dot(n, normalize(vec3(0.5,0.8,0.3))) * 0.5 + 0.5, 0.25, 1.0);
    vec3 facade = uFacade * 0.10 * light;

    vec3 emissive = vec3(0.0);
    if (!roof) {
      float yUp = vPos.y + uHalfH;            // 0..height from street
      float horiz = abs(n.z) > 0.5 ? vPos.x : vPos.z;
      vec2 cell = vec2(floor(horiz / 1.15), floor(yUp / 1.7));
      vec2 f = vec2(fract(horiz / 1.15), fract(yUp / 1.7));
      float win = step(0.16, f.x) * step(f.x, 0.84) * step(0.22, f.y) * step(f.y, 0.82);
      float lit = step(0.52, hash(cell + uSeed));
      // warm/cool window mix + subtle flicker on a few windows
      float warm = hash(cell + uSeed + 7.3);
      vec3 wc = mix(vec3(1.0, 0.83, 0.55), vec3(0.62, 0.84, 1.0), warm);
      float flick = 1.0 - uFlow * step(0.92, hash(cell + uSeed + 3.1)) *
                    (0.5 + 0.5 * sin(uTime * 6.0 + cell.x * 4.0));
      emissive = wc * win * lit * (0.9 * flick);
    } else {
      // rooftop: dark with a faint rim
      facade = uFacade * 0.06;
    }

    // fresnel rim — stronger when emphasized
    float fres = pow(1.0 - clamp(dot(normalize(vView), n), 0.0, 1.0), 2.5);
    vec3 rim = uHighlight * fres * (0.15 + uEmphasis * 1.4);

    vec3 col = facade + emissive + rim + uHighlight * uEmphasis * 0.25;
    gl_FragColor = vec4(col, uOpacity);
  }
`;

const ACCENT = new THREE.Color("#22C55E");
const HL = new THREE.Color("#38BDF8");

function makeUniforms(facade: THREE.Color, halfH: number, seed: number, flow: number) {
  return {
    uHalfH: { value: halfH },
    uSeed: { value: seed },
    uFacade: { value: facade.clone() },
    uTime: { value: 0 },
    uFlow: { value: flow },
    uEmphasis: { value: 0 },
    uHighlight: { value: new THREE.Color("#38BDF8") },
    uOpacity: { value: 1 },
  };
}

export function Skyscraper({ repo, districtColor, dimmed, highlighted }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const mats = useRef<THREE.ShaderMaterial[]>([]);
  const [hovered, setHovered] = useState(false);

  const select = useStore((s) => s.select);
  const hover = useStore((s) => s.hover);
  const selectedId = useStore((s) => s.selectedId);
  const reducedMotion = useStore((s) => s.reducedMotion);
  const selected = selectedId === repo.id;

  const facade = useMemo(() => new THREE.Color(districtColor), [districtColor]);
  const seed = useMemo(() => (parseInt(repo.id, 10) % 997) * 0.123, [repo.id]);

  // wedding-cake setbacks for tall towers → NYC silhouette variety
  const segments = useMemo(() => {
    const h = repo.height;
    const fp = repo.footprint;
    const segs: { w: number; h: number; y: number }[] = [];
    if (h > 30) {
      const h1 = h * 0.62;
      const h2 = h * 0.26;
      const h3 = h * 0.12;
      segs.push({ w: fp, h: h1, y: h1 / 2 });
      segs.push({ w: fp * 0.74, h: h2, y: h1 + h2 / 2 });
      segs.push({ w: fp * 0.5, h: h3, y: h1 + h2 + h3 / 2 });
    } else if (h > 16) {
      const h1 = h * 0.78;
      const h2 = h * 0.22;
      segs.push({ w: fp, h: h1, y: h1 / 2 });
      segs.push({ w: fp * 0.7, h: h2, y: h1 + h2 / 2 });
    } else {
      segs.push({ w: fp, h, y: h / 2 });
    }
    return segs;
  }, [repo.height, repo.footprint]);

  const tall = repo.height > 30;

  useFrame((_, dt) => {
    const target = selected ? 1 : hovered ? 0.6 : highlighted ? 0.85 : 0;
    const hlColor = selected ? ACCENT : HL;
    const lerp = reducedMotion ? 1 : Math.min(1, dt * 8);
    for (const m of mats.current) {
      if (!m) continue;
      if (!reducedMotion) m.uniforms.uTime.value += dt;
      m.uniforms.uEmphasis.value += (target - m.uniforms.uEmphasis.value) * lerp;
      (m.uniforms.uHighlight.value as THREE.Color).lerp(hlColor, lerp);
      const op = dimmed ? 0.06 : 1;
      m.uniforms.uOpacity.value += (op - m.uniforms.uOpacity.value) * lerp;
    }
    if (groupRef.current && !reducedMotion) {
      const s = selected ? 1 + Math.sin(performance.now() * 0.004) * 0.01 : 1;
      groupRef.current.scale.setScalar(s);
    }
  });

  mats.current = [];

  return (
    <group
      ref={groupRef}
      position={[repo.pos[0], 0, repo.pos[2]]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        hover(repo.id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        hover(null);
        document.body.style.cursor = "default";
      }}
      onClick={(e) => {
        e.stopPropagation();
        select(repo.id);
      }}
    >
      {segments.map((s, i) => (
        <mesh key={i} position={[0, s.y, 0]} castShadow receiveShadow>
          <boxGeometry args={[s.w, s.h, s.w]} />
          <shaderMaterial
            ref={(m) => {
              if (m) mats.current.push(m);
            }}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={makeUniforms(facade, s.h / 2, seed + i * 1.7, reducedMotion ? 0 : 1)}
            transparent
          />
        </mesh>
      ))}

      {/* antenna beacon on the tallest towers */}
      {tall && (
        <mesh position={[0, repo.height + 1.6, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 3.2, 6]} />
          <meshBasicMaterial color="#F87171" />
        </mesh>
      )}

      {(hovered || selected) && (
        <Html
          position={[0, repo.height + (tall ? 4 : 2), 0]}
          center
          distanceFactor={70}
          zIndexRange={[40, 0]}
        >
          <div className="pointer-events-none whitespace-nowrap rounded-md border border-surface-2/70 bg-surface/90 px-2 py-1 font-mono text-[11px] text-ink shadow-lg backdrop-blur">
            {repo.name}
            <span className="ml-1.5 text-muted">★{repo.stars}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
