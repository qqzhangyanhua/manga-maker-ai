import { Button } from "@/components/ui/button";
import { RotateCcw, Save, Sparkles, Loader2, Undo, Redo, FlipHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PoseData } from "./Mannequin";

interface ActionButtonsProps {
  isLoadingCharacters: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onMirror: () => void;
  onReset: () => void;
  onSave: () => void;
  onGenerate: () => void;
  charactersCount: number;
}

/**
 * Action buttons panel for pose editor operations
 */
export function ActionButtons({
  isLoadingCharacters,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onMirror,
  onReset,
  onSave,
  onGenerate,
  charactersCount,
}: ActionButtonsProps) {
  return (
    <div className="space-y-2">
      <Button
        variant="comic"
        className="w-full"
        onClick={onGenerate}
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

      {/* 编辑操作 */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          onClick={onUndo}
          disabled={!canUndo}
          title="撤销"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          onClick={onRedo}
          disabled={!canRedo}
          title="重做"
        >
          <Redo className="w-4 h-4" />
        </Button>
        <Button variant="outline" onClick={onMirror} title="镜像翻转">
          <FlipHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* 保存和重置 */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="w-4 h-4" />
          重置
        </Button>
        <Button variant="outline" onClick={onSave}>
          <Save className="w-4 h-4" />
          保存
        </Button>
      </div>
    </div>
  );
}

/**
 * Utility function to mirror a pose (flip left/right)
 */
export function mirrorPose(pose: PoseData): PoseData {
  return {
    ...pose,
    // 翻转左右肩膀
    leftShoulder: [-pose.rightShoulder[0], pose.rightShoulder[1], pose.rightShoulder[2]],
    rightShoulder: [-pose.leftShoulder[0], pose.leftShoulder[1], pose.leftShoulder[2]],
    // 翻转左右肘部
    leftElbow: [-pose.rightElbow[0], pose.rightElbow[1], pose.rightElbow[2]],
    rightElbow: [-pose.leftElbow[0], pose.leftElbow[1], pose.leftElbow[2]],
    // 翻转左右手腕
    leftWrist: [-pose.rightWrist[0], pose.rightWrist[1], pose.rightWrist[2]],
    rightWrist: [-pose.leftWrist[0], pose.leftWrist[1], pose.leftWrist[2]],
    // 翻转左右髋部
    leftHip: [-pose.rightHip[0], pose.rightHip[1], pose.rightHip[2]],
    rightHip: [-pose.leftHip[0], pose.leftHip[1], pose.leftHip[2]],
    // 翻转左右膝盖
    leftKnee: [-pose.rightKnee[0], pose.rightKnee[1], pose.rightKnee[2]],
    rightKnee: [-pose.leftKnee[0], pose.leftKnee[1], pose.leftKnee[2]],
    // 翻转左右脚踝
    leftAnkle: [-pose.rightAnkle[0], pose.rightAnkle[1], pose.rightAnkle[2]],
    rightAnkle: [-pose.leftAnkle[0], pose.leftAnkle[1], pose.leftAnkle[2]],
  };
}

/**
 * Utility function to save pose to localStorage
 */
export function savePoseToLocalStorage(pose: PoseData): string {
  const savedPoses = JSON.parse(localStorage.getItem("customPoses") || "[]");
  const poseName = `自定义姿势_${new Date().toLocaleString("zh-CN")}`;
  savedPoses.push({
    name: poseName,
    pose,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem("customPoses", JSON.stringify(savedPoses));
  return poseName;
}
