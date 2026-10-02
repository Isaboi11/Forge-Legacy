import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useLoader, useThree } from '@react-three/fiber';
import { staticFile } from 'remotion';
import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import type { Pose } from './timeline';
import { SCREEN_H, SCREEN_W } from './Phone';

// The same generic phone as Phone.tsx (430 × 890, centred punch-hole, two-lens bump, FL on the back — never an
// iPhone), built in real 3D: a brushed-metal edge and a glass front that reflect a studio HDRI (Poly Haven
// "Studio Small 09", CC0). It is drawn on a transparent canvas laid OVER the DOM screen: the screen's opening is
// a depth-only mask, so the recording shows through it, and the glass adds its reflections on top as light.
// The camera matches the CSS `perspective: 2400` the rest of the film uses, so the canvas and the DOM line up.

export const PERSPECTIVE = 2400;
const BW = 430, BH = 890, BR = 66, DEPTH = 13;

function roundRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// quadratic corners read slightly squarer than CSS's circular ones; a squircle-ish phone corner is fine.

// Reflections ADD light: rgb is summed, alpha is left as it was, so over the screen's opening (alpha 0) the
// premultiplied canvas composites as pure added light on the DOM screen beneath.
const additive = {
  transparent: true, depthWrite: false, blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
} as const;

function flMark() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 40, 0, 210);
  gr.addColorStop(0, '#F3D9AE'); gr.addColorStop(0.55, '#C99767'); gr.addColorStop(1, '#7E5C3B');
  g.fillStyle = gr;
  g.font = '600 150px "Playfair Display", Georgia, serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('F L', 256, 132);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// three applies a material's envMapIntensity only to its OWN envMap (not scene.environment), so every material
// gets this texture directly.
function useStudio() {
  const hdr = useLoader(HDRLoader, staticFile('hdri/studio_small_09_1k.hdr'));
  const { gl } = useThree();
  return useMemo(() => {
    // The studio as it is (a white cyclorama) would wash the glass grey. So the real studio stays as a faint fill,
    // and the light that reads on the glass and the edge comes from three dark-studio strip softboxes placed
    // BEHIND the camera — where a near-flat screen reflects — so the drift slides a strip across the glass.
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const studio = new THREE.Scene();
    studio.background = hdr;
    studio.backgroundIntensity = 0.05;
    const strip = (w: number, h: number, pos: [number, number, number], rz: number, rgb: [number, number, number]) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), side: THREE.DoubleSide }));
      mesh.position.set(...pos);
      mesh.lookAt(0, 0, 0);
      mesh.rotateZ(rz);
      studio.add(mesh);
    };
    strip(0.9, 16, [-3.0, 1.2, 9], 0.5, [5.0, 4.4, 3.6]); // the key: a warm diagonal strip, upper left
    strip(0.35, 16, [4.2, 0, 8], 0.5, [2.2, 2.0, 1.8]); // a thin second strip, right
    strip(14, 2.4, [0, 9, 2], 0, [2.6, 2.3, 1.9]); // overhead: lights the top edge
    strip(3, 14, [-9, 0, -2], 0, [2.4, 2.0, 1.5]); // left wall: lights the left side when it turns
    strip(3, 14, [9, 0, -2], 0, [1.6, 1.4, 1.1]); // right wall
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(studio, 0.015).texture;
    pm.dispose();
    return env;
  }, [hdr, gl]);
}

const Body: React.FC<{ pose: Pose }> = ({ pose: p }) => {
  const env = useStudio();
  const g = useMemo(() => {
    const bt = 4, bs = 4.5;
    const body = new THREE.ExtrudeGeometry(roundRect(BW - 2 * bs, BH - 2 * bs, BR - bs), {
      depth: DEPTH - 2 * bt - 0.6, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 8, curveSegments: 40,
    });
    body.translate(0, 0, -DEPTH + bt);
    const bezelShape = roundRect(BW - 8, BH - 8, BR - 4);
    bezelShape.holes.push(roundRect(SCREEN_W, SCREEN_H, 52));
    const bezel = new THREE.ShapeGeometry(bezelShape, 32);
    const mask = new THREE.ShapeGeometry(roundRect(SCREEN_W, SCREEN_H, 52), 32);
    const glass = new THREE.ShapeGeometry(roundRect(BW - 4, BH - 4, BR - 2), 32);
    const bump = new THREE.ExtrudeGeometry(roundRect(74, 150, 37), { depth: 2.5, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 3, curveSegments: 24 });
    const lens = new THREE.CylinderGeometry(24, 24, 1.6, 48);
    lens.rotateX(Math.PI / 2);
    const ring = new THREE.TorusGeometry(26, 2.2, 12, 48);
    return { body, bezel, mask, glass, bump, lens, ring };
  }, []);
  const m = useMemo(() => {
    const metal = new THREE.MeshPhysicalMaterial({ color: '#8f877e', metalness: 1, roughness: 0.27, envMapIntensity: 0.95 });
    const back = new THREE.MeshPhysicalMaterial({ color: '#1d1a17', metalness: 0.2, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.7 });
    const bezel = new THREE.MeshPhysicalMaterial({ color: '#020203', metalness: 0, roughness: 0.2 });
    const mask = new THREE.MeshBasicMaterial({ colorWrite: false });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#000000', metalness: 0, roughness: 0.03, ior: 1.52, specularIntensity: 1, envMapIntensity: 0.18, ...additive });
    const bump = new THREE.MeshPhysicalMaterial({ color: '#121110', metalness: 0.4, roughness: 0.25, clearcoat: 1, envMapIntensity: 0.8 });
    const lens = new THREE.MeshPhysicalMaterial({ color: '#05070a', metalness: 0.1, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.4 });
    const fl = new THREE.MeshBasicMaterial({ map: flMark(), transparent: true });
    for (const x of [metal, back, bezel, glass, bump, lens]) x.envMap = env;
    return { metal, back, bezel, mask, glass, bump, lens, fl };
  }, [env]);
  // CSS (y down) → three (y up): flip y, and rotations about x and z change sign. Same order as the CSS transform.
  const D = Math.PI / 180;
  return (
    <group position={[p.x, -p.y, p.z]} rotation={new THREE.Euler(-p.rx * D, p.ry * D, -p.rz * D, 'XYZ')} scale={p.s}>
      <mesh geometry={g.body} material={[m.back, m.metal]} />
      <mesh geometry={g.mask} material={m.mask} position={[0, 0, 0.05]} renderOrder={-1} />
      <mesh geometry={g.bezel} material={m.bezel} position={[0, 0, 0]} />
      <mesh geometry={g.glass} material={m.glass} position={[0, 0, 0.6]} renderOrder={10} />
      {/* back: camera bump top-left as seen from behind, the FL mark low on the panel (same places as the CSS phone) */}
      <group position={[140, BH / 2 - 38 - 75, -DEPTH]} rotation={[0, Math.PI, 0]}>
        <mesh geometry={g.bump} material={m.bump} />
        {[-33, 33].map((dy) => (
          <group key={dy} position={[0, dy, 3.4]}>
            <mesh geometry={g.lens} material={m.lens} />
            <mesh geometry={g.ring} material={m.metal} />
          </group>
        ))}
      </group>
      <mesh position={[0, BH / 2 - 432, -DEPTH - 0.05]} rotation={[0, Math.PI, 0]} material={m.fl}>
        <planeGeometry args={[220, 110]} />
      </mesh>
    </group>
  );
};

export const PhoneBody3D: React.FC<{ W: number; H: number; pose: Pose }> = ({ W, H, pose }) => {
  const fov = (2 * Math.atan(H / 2 / PERSPECTIVE) * 180) / Math.PI;
  return (
    <ThreeCanvas
      width={W} height={H} style={{ position: 'absolute', inset: 0 }}
      camera={{ fov, near: 10, far: 10000, position: [0, 0, PERSPECTIVE] }}
      gl={{ alpha: true, premultipliedAlpha: true, antialias: true }}
      dpr={1}
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[-900, 1200, 1400]} intensity={1.4} color="#f3d9ae" />
      <directionalLight position={[1200, -300, -600]} intensity={0.9} color="#c99767" />
      <Body pose={pose} />
    </ThreeCanvas>
  );
};
