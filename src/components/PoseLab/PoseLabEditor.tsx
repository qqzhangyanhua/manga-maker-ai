import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import Mannequin, { PoseData } from "./Mannequin";
import { Button } from "@/components/ui/button";
import { RotateCcw, Save, Download, Upload, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const defaultPose: PoseData = {
  head: [0, 2.0, 0],
  neck: [0, 1.7, 0],
  chest: [0, 1.3, 0],
  hips: [0, 0.9, 0],
  leftShoulder: [-0.3, 1.6, 0],
  leftElbow: [-0.5, 1.2, 0],
  leftWrist: [-0.7, 0.9, 0],
  rightShoulder: [0.3, 1.6, 0],
  rightElbow: [0.5, 1.2, 0],
  rightWrist: [0.7, 0.9, 0],
  leftHip: [-0.15, 0.9, 0],
  leftKnee: [-0.15, 0.5, 0],
  leftAnkle: [-0.15, 0.1, 0],
  rightHip: [0.15, 0.9, 0],
  rightKnee: [0.15, 0.5, 0],
  rightAnkle: [0.15, 0.1, 0],
};

const presetPoses: { name: string; pose: PoseData }[] = [
  {
    name: "站立",
    pose: defaultPose,
  },
  {
    name: "战斗姿态",
    pose: {
      ...defaultPose,
      leftElbow: [-0.6, 1.4, 0.2],
      leftWrist: [-0.4, 1.6, 0.3],
      rightElbow: [0.6, 1.3, 0.1],
      rightWrist: [0.8, 1.1, 0.2],
      leftKnee: [-0.3, 0.5, 0.2],
      rightKnee: [0.3, 0.4, -0.1],
    },
  },
  {
    name: "奔跑",
    pose: {
      ...defaultPose,
      leftElbow: [-0.3, 1.2, 0.4],
      leftWrist: [-0.2, 1.0, 0.5],
      rightElbow: [0.4, 1.3, -0.3],
      rightWrist: [0.5, 1.5, -0.2],
      leftKnee: [-0.3, 0.6, 0.3],
      leftAnkle: [-0.4, 0.2, 0.4],
      rightKnee: [0.2, 0.4, -0.2],
      rightAnkle: [0.1, 0.1, -0.3],
    },
  },
  {
    name: "思考",
    pose: {
      ...defaultPose,
      head: [0, 2.0, -0.1],
      rightElbow: [0.4, 1.5, 0.2],
      rightWrist: [0.2, 1.8, 0.1],
      leftElbow: [-0.4, 1.0, 0.1],
      leftWrist: [-0.3, 0.8, 0.2],
    },
  },
];

interface PoseLabEditorProps {
  onGenerateWithPose?: (pose: PoseData) => void;
}

const PoseLabEditor = ({ onGenerateWithPose }: PoseLabEditorProps) => {
  const [pose, setPose] = useState<PoseData>(defaultPose);
  const [selectedPreset, setSelectedPreset] = useState<string>("站立");

  const handleReset = () => {
    setPose(defaultPose);
    setSelectedPreset("站立");
  };

  const handlePresetSelect = (preset: { name: string; pose: PoseData }) => {
    setPose(preset.pose);
    setSelectedPreset(preset.name);
  };

  const handleGenerate = () => {
    if (onGenerateWithPose) {
      onGenerateWithPose(pose);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4">
      {/* 3D Canvas */}
      <div className="flex-1 comic-card overflow-hidden rounded-xl min-h-[400px]">
        <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
            <pointLight position={[-5, 5, -5]} intensity={0.5} />
            
            <Mannequin pose={pose} onPoseChange={setPose} />
            
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

      {/* Controls Panel */}
      <div className="w-full lg:w-80 space-y-4">
        {/* Preset Poses */}
        <div className="comic-card p-4">
          <h3 className="font-comic text-lg text-foreground mb-3">预设姿势</h3>
          <div className="grid grid-cols-2 gap-2">
            {presetPoses.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetSelect(preset)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                  "border-2",
                  selectedPreset === preset.name
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                )}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="comic-card p-4">
          <h3 className="font-comic text-lg text-foreground mb-3">操作说明</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>点击关节点选择</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>拖拽旋转视角</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>滚轮缩放画面</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>右键平移画面</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            variant="comic"
            className="w-full"
            onClick={handleGenerate}
          >
            <Sparkles className="w-4 h-4" />
            使用此姿势生成
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
              重置
            </Button>
            <Button variant="outline">
              <Save className="w-4 h-4" />
              保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoseLabEditor;
