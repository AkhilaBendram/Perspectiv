import { PropsWithChildren, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';

function StarSphere() {
  const texture = useTexture('/textures/8k_stars_milky_way.jpg');
  texture.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh scale={-60}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

function Moon() {
  const texture = useTexture('/textures/2k_moon.jpg');
  texture.colorSpace = THREE.SRGBColorSpace;
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });
  return (
    <mesh ref={ref} position={[3, -1, -10]} scale={2.5}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  );
}

export default function StarBG({ children }: PropsWithChildren) {
  return (
    <div className="relative min-h-screen w-full">
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
          <ambientLight intensity={0.3} />
          <spotLight position={[0, 5, 10]} angle={0.4} intensity={2} />
          <Suspense fallback={null}>
            <StarSphere />
            <Moon />
          </Suspense>
          <OrbitControls enableZoom={false} autoRotate />
        </Canvas>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
