import { useRef, useState, useEffect, forwardRef } from "react";
import { Sphere, Cylinder, Html, TransformControls } from "@react-three/drei";
import * as THREE from "three";

interface JointProps {
  position: [number, number, number];
  name: string;
  selected: boolean;
  onSelect: () => void;
}

const Joint = forwardRef<THREE.Mesh, JointProps>(
  ({ position, name, selected, onSelect }, ref) => {
    const [hovered, setHovered] = useState(false);

    return (
      <Sphere
        ref={ref}
        args={[0.08, 16, 16]}
        position={position}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={selected ? "#ef4444" : hovered ? "#fbbf24" : "#3b82f6"}
          emissive={selected ? "#ef4444" : hovered ? "#fbbf24" : "#1d4ed8"}
          emissiveIntensity={0.3}
        />
        {(selected || hovered) && (
          <Html distanceFactor={10}>
            <div className="bg-background/90 px-2 py-1 rounded text-xs font-semibold text-foreground whitespace-nowrap">
              {name}
            </div>
          </Html>
        )}
      </Sphere>
    );
  }
);

Joint.displayName = "Joint";

interface BoneProps {
  start: [number, number, number];
  end: [number, number, number];
}

const Bone = ({ start, end }: BoneProps) => {
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);
  const midpoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(endVec, startVec);
  const length = direction.length();
  
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());

  return (
    <Cylinder
      args={[0.03, 0.03, length, 8]}
      position={[midpoint.x, midpoint.y, midpoint.z]}
      quaternion={quaternion}
    >
      <meshStandardMaterial color="#64748b" />
    </Cylinder>
  );
};

export interface PoseData {
  head: [number, number, number];
  neck: [number, number, number];
  chest: [number, number, number];
  hips: [number, number, number];
  leftShoulder: [number, number, number];
  leftElbow: [number, number, number];
  leftWrist: [number, number, number];
  rightShoulder: [number, number, number];
  rightElbow: [number, number, number];
  rightWrist: [number, number, number];
  leftHip: [number, number, number];
  leftKnee: [number, number, number];
  leftAnkle: [number, number, number];
  rightHip: [number, number, number];
  rightKnee: [number, number, number];
  rightAnkle: [number, number, number];
}

interface MannequinProps {
  pose: PoseData;
  onPoseChange: (pose: PoseData) => void;
}

const Mannequin = ({ pose, onPoseChange }: MannequinProps) => {
  const [selectedJoint, setSelectedJoint] = useState<keyof PoseData | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const jointRefs = useRef<Record<keyof PoseData, THREE.Mesh | null>>({} as Record<keyof PoseData, THREE.Mesh | null>);

  // 监听 TransformControls 的变化并更新姿势
  const handleTransformChange = () => {
    if (selectedJoint && jointRefs.current[selectedJoint]) {
      const mesh = jointRefs.current[selectedJoint];
      if (mesh) {
        const newPosition: [number, number, number] = [
          mesh.position.x,
          mesh.position.y,
          mesh.position.z,
        ];
        onPoseChange({
          ...pose,
          [selectedJoint]: newPosition,
        });
      }
    }
  };

  const joints: { name: string; key: keyof PoseData }[] = [
    { name: "头部", key: "head" },
    { name: "颈部", key: "neck" },
    { name: "胸部", key: "chest" },
    { name: "臀部", key: "hips" },
    { name: "左肩", key: "leftShoulder" },
    { name: "左肘", key: "leftElbow" },
    { name: "左腕", key: "leftWrist" },
    { name: "右肩", key: "rightShoulder" },
    { name: "右肘", key: "rightElbow" },
    { name: "右腕", key: "rightWrist" },
    { name: "左髋", key: "leftHip" },
    { name: "左膝", key: "leftKnee" },
    { name: "左踝", key: "leftAnkle" },
    { name: "右髋", key: "rightHip" },
    { name: "右膝", key: "rightKnee" },
    { name: "右踝", key: "rightAnkle" },
  ];

  const bones: { start: keyof PoseData; end: keyof PoseData }[] = [
    { start: "head", end: "neck" },
    { start: "neck", end: "chest" },
    { start: "chest", end: "hips" },
    { start: "neck", end: "leftShoulder" },
    { start: "leftShoulder", end: "leftElbow" },
    { start: "leftElbow", end: "leftWrist" },
    { start: "neck", end: "rightShoulder" },
    { start: "rightShoulder", end: "rightElbow" },
    { start: "rightElbow", end: "rightWrist" },
    { start: "hips", end: "leftHip" },
    { start: "leftHip", end: "leftKnee" },
    { start: "leftKnee", end: "leftAnkle" },
    { start: "hips", end: "rightHip" },
    { start: "rightHip", end: "rightKnee" },
    { start: "rightKnee", end: "rightAnkle" },
  ];

  return (
    <group ref={groupRef}>
      {/* Bones */}
      {bones.map((bone, index) => (
        <Bone key={index} start={pose[bone.start]} end={pose[bone.end]} />
      ))}

      {/* Joints */}
      {joints.map((joint) => (
        <Joint
          key={joint.key}
          ref={(ref) => {
            if (ref) {
              jointRefs.current[joint.key] = ref;
            }
          }}
          position={pose[joint.key]}
          name={joint.name}
          selected={selectedJoint === joint.key}
          onSelect={() => setSelectedJoint(joint.key)}
        />
      ))}

      {/* Head sphere */}
      <Sphere args={[0.15, 16, 16]} position={pose.head}>
        <meshStandardMaterial color="#94a3b8" />
      </Sphere>

      {/* TransformControls for selected joint */}
      {selectedJoint && jointRefs.current[selectedJoint] && (
        <TransformControls
          object={jointRefs.current[selectedJoint]!}
          mode="translate"
          onObjectChange={handleTransformChange}
          showX={true}
          showY={true}
          showZ={true}
          size={0.8}
        />
      )}
    </group>
  );
};

export default Mannequin;
