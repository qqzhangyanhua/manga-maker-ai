import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import Mannequin, { PoseData } from "./Mannequin";

interface PoseCanvasProps {
  pose: PoseData;
  onPoseChange: (pose: PoseData) => void;
}

/**
 * 3D Canvas component for displaying and editing poses
 */
export function PoseCanvas({ pose, onPoseChange }: PoseCanvasProps) {
  return (
    <div className="flex-1 comic-card overflow-hidden rounded-xl min-h-[400px]">
      <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <pointLight position={[-5, 5, -5]} intensity={0.5} />

          <Mannequin pose={pose} onPoseChange={onPoseChange} />

          <Grid
            args={[10, 10]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#374151"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#6b7280"
            fadeDistance={10}
            fadeStrength={1}
            position={[0, 0, 0]}
          />

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={10}
          />

          <Environment preset="studio" />
        </Suspense>
      </Canvas>
    </div>
  );
}
