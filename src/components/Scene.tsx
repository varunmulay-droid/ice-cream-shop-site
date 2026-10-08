import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Float, Sparkles, ContactShadows, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { scrollState, themeState } from '@/lib/state';

/** Normalize any GLB to a target size and center it. */
function NormalizedModel({ url, size }: { url: string; size: number }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const dims = new THREE.Vector3();
    box.getSize(dims);
    const max = Math.max(dims.x, dims.y, dims.z) || 1;
    const s = size / max;
    c.scale.setScalar(s);
    const box2 = new THREE.Box3().setFromObject(c);
    const center = new THREE.Vector3();
    box2.getCenter(center);
    c.position.sub(center);
    return c;
  }, [scene, size]);
  return <primitive object={cloned} />;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Hero cone — center stage, scroll-choreographed. */
function HeroCone() {
  const group = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const p = scrollState.progress;
    // Dreamy multi-axis sine float
    group.current.position.y = Math.sin(t * 0.9) * 0.15;
    group.current.rotation.x = Math.sin(t * 0.15) * 0.12;
    // Cursor parallax ±15°
    group.current.rotation.x += pointer.y * -0.26;
    group.current.rotation.y = t * 0.25 + p * Math.PI * 4 + pointer.x * 0.26;
    // Scroll choreography: hero → zoom-in (craft) → spin out (flavors) → recede
    const zoomIn = Math.min(p / 0.35, 1);
    const zoomOut = Math.max((p - 0.55) / 0.45, 0);
    const scale = lerp(lerp(1, 1.9, zoomIn), 0.7, zoomOut);
    group.current.scale.setScalar(scale);
    group.current.position.x = lerp(lerp(0, 0, zoomIn), -2.6, Math.max((p - 0.62) / 0.38, 0));
  });
  return (
    <group ref={group}>
      <Float speed={1.6} rotationIntensity={0.35} floatIntensity={0.9}>
        <NormalizedModel url="/models/cone.glb" size={2.6} />
      </Float>
    </group>
  );
}

/** Satellite scoop — drifts stage left. */
function SideScoop() {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const p = scrollState.progress;
    group.current.position.x = lerp(-3.4, -1.6, Math.min(p / 0.5, 1));
    group.current.position.y = 1.1 + Math.sin(t * 0.7 + 2) * 0.22;
    group.current.rotation.y = -t * 0.18 + p * Math.PI * 2;
    const s = lerp(0.55, 1.0, Math.min(p / 0.5, 1)) * (1 - Math.max((p - 0.75) / 0.25, 0) * 0.4);
    group.current.scale.setScalar(s);
  });
  return (
    <group ref={group}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1.2}>
        <NormalizedModel url="/models/scoop.glb" size={1.4} />
      </Float>
    </group>
  );
}

/** Satellite ice-cream bar — drifts stage right. */
function SideBar() {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const p = scrollState.progress;
    group.current.position.x = lerp(3.5, 2.2, Math.min(Math.max((p - 0.25) / 0.5, 0), 1));
    group.current.position.y = -0.9 + Math.cos(t * 0.8 + 1) * 0.2;
    group.current.rotation.z = 0.35 + Math.sin(t * 0.4) * 0.1;
    group.current.rotation.y = t * 0.22 - p * Math.PI * 3;
    const s = lerp(0.5, 0.95, Math.min(Math.max((p - 0.25) / 0.5, 0), 1));
    group.current.scale.setScalar(s);
  });
  return (
    <group ref={group}>
      <Float speed={1.8} rotationIntensity={0.4} floatIntensity={1}>
        <NormalizedModel url="/models/bar.glb" size={1.5} />
      </Float>
    </group>
  );
}

/** Lighting rig that eases toward the active flavor theme. */
function ThemedLights() {
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.PointLight>(null);
  const targetKey = useMemo(() => new THREE.Color(), []);
  const targetRim = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    targetKey.set(themeState.light);
    targetRim.set(themeState.rim);
    key.current?.color.lerp(targetKey, 0.05);
    rim.current?.color.lerp(targetRim, 0.05);
  });
  return (
    <>
      <ambientLight intensity={0.9} color="#fff6ea" />
      <directionalLight ref={key} position={[4, 6, 4]} intensity={1.6} color="#ffd9e0" />
      <pointLight ref={rim} position={[-4, -3, -2]} intensity={12} color="#FF3366" />
      <spotLight position={[0, 8, 2]} angle={0.5} penumbra={1} intensity={1.2} color="#ffffff" />
    </>
  );
}

export default function Scene() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 7], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ThemedLights />
        <Environment preset="city" />
        <HeroCone />
        <SideScoop />
        <SideBar />
        <Sparkles count={90} scale={[14, 10, 4]} size={3.5} speed={0.35} color="#FFB7B2" opacity={0.7} />
        <Sparkles count={50} scale={[14, 10, 4]} size={6} speed={0.2} color="#B5EAD7" opacity={0.5} />
        <ContactShadows position={[0, -2.6, 0]} opacity={0.22} scale={12} blur={2.8} far={4} color="#2B1B17" />
        <EffectComposer>
          <Bloom intensity={0.55} luminanceThreshold={0.75} luminanceSmoothing={0.2} mipmapBlur />
          <ChromaticAberration offset={[0.0006, 0.0006]} />
          <Vignette eskil={false} offset={0.18} darkness={0.55} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

useGLTF.preload('/models/cone.glb');
useGLTF.preload('/models/scoop.glb');
useGLTF.preload('/models/bar.glb');
