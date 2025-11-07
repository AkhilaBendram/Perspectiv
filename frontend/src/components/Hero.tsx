import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';

function StarsBG() {
  const texture = useTexture('/textures/8k_stars_milky_way.jpg');
  return (
    <mesh scale={-60}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

function Moon() {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture('/textures/2k_moon.jpg');

  useFrame((state) => {
    if (meshRef.current) {
      // slow, buttery spin
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} position={[3, -1, -10]} scale={2.5}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  );
}

export default function Hero() {
  return (
    <section className="absolute inset-0">
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
        <ambientLight intensity={0.3} />
        <spotLight position={[0, 5, 10]} angle={0.4} intensity={2} />
        <Suspense fallback={null}>
          <StarsBG />
          <Moon />
        </Suspense>
        <OrbitControls enableZoom={false} autoRotate={false} />
      </Canvas>
    </section>
  );
}
