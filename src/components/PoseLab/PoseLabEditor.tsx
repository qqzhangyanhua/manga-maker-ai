import { useState, Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import Mannequin, { PoseData } from "./Mannequin";
import { Button } from "@/components/ui/button";
import { RotateCcw, Save, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { poseToDescription, getPresetPoseDescription } from "@/lib/pose-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Character = {
  id: string;
  name: string;
  description: string | null;
  base_image_url: string | null;
};

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
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
  const { toast } = useToast();

  // 加载用户的角色列表
  useEffect(() => {
    const loadCharacters = async () => {
      setIsLoadingCharacters(true);
      try {
        const response = await fetch("/api/character");
        if (!response.ok) {
          throw new Error("加载角色列表失败");
        }
        const data = await response.json();
        setCharacters(data.characters || []);
      } catch (error) {
        console.error("Failed to load characters:", error);
        toast({
          variant: "destructive",
          title: "加载失败",
          description: error instanceof Error ? error.message : "无法加载角色列表",
        });
      } finally {
        setIsLoadingCharacters(false);
      }
    };
    loadCharacters();
  }, [toast]);

  const handleReset = () => {
    setPose(defaultPose);
    setSelectedPreset("站立");
  };

  const handlePresetSelect = (preset: { name: string; pose: PoseData }) => {
    setPose(preset.pose);
    setSelectedPreset(preset.name);
  };

  const handleGenerate = () => {
    // 检查是否有角色可用
    if (characters.length === 0) {
      toast({
        variant: "destructive",
        title: "没有可用角色",
        description: "请先在角色库中创建至少一个角色",
      });
      return;
    }

    // 打开生成对话框
    setShowGenerateDialog(true);
  };

  const handleConfirmGenerate = async () => {
    if (!selectedCharacterId) {
      toast({
        variant: "destructive",
        title: "请选择角色",
        description: "请先选择要生成的角色",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // 生成姿势描述
      const poseDescription = selectedPreset
        ? getPresetPoseDescription(selectedPreset)
        : poseToDescription(pose);

      // 调用姿势变体生成 API（保存为独立变体，不覆盖三视图）
      const selectedCharacter = characters.find((c) => c.id === selectedCharacterId);

      const response = await fetch("/api/character/generate-pose-variant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: selectedCharacterId,
          pose_description: poseDescription,
          pose_name: selectedPreset || "自定义姿势",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "生成失败");
      }

      const data = await response.json();

      toast({
        title: "姿势变体生成成功",
        description: `已为角色"${selectedCharacter?.name}"生成"${data.image.pose_name}"姿势变体，可在角色详情的"姿势变体"标签中查看`,
      });

      // 关闭对话框
      setShowGenerateDialog(false);
      setSelectedCharacterId("");

      // 调用回调（如果有）
      if (onGenerateWithPose) {
        onGenerateWithPose(pose);
      }
    } catch (error) {
      console.error("Generate error:", error);
      toast({
        variant: "destructive",
        title: "生成失败",
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
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
              disabled={isLoadingCharacters}
            >
              {isLoadingCharacters ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  加载角色中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  使用此姿势生成
                </>
              )}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
                重置
              </Button>
              <Button variant="outline" disabled>
                <Save className="w-4 h-4" />
                保存
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>使用此姿势生成角色图片</DialogTitle>
            <DialogDescription>
              选择一个角色，系统将生成该角色在当前姿势下的图片
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">选择角色</label>
              <Select value={selectedCharacterId} onValueChange={setSelectedCharacterId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择一个角色" />
                </SelectTrigger>
                <SelectContent>
                  {characters.map((character) => (
                    <SelectItem key={character.id} value={character.id}>
                      {character.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCharacterId && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="text-sm font-medium">姿势描述：</div>
                <div className="text-sm text-muted-foreground">
                  {selectedPreset
                    ? getPresetPoseDescription(selectedPreset)
                    : poseToDescription(pose)}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowGenerateDialog(false);
                setSelectedCharacterId("");
              }}
              disabled={isGenerating}
            >
              取消
            </Button>
            <Button onClick={handleConfirmGenerate} disabled={isGenerating || !selectedCharacterId}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  开始生成
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PoseLabEditor;
