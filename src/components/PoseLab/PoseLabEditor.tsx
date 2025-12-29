import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { poseToDescription, getPresetPoseDescription } from "@/lib/pose-utils";
import { PoseLabEditorProps, GeneratedImage, PresetPose } from "./types";
import { defaultPose, presetPoses } from "./pose-presets";
import { usePoseHistory } from "./usePoseHistory";
import { useCharacterLoader } from "./useCharacterLoader";
import { PoseCanvas } from "./PoseCanvas";
import { PresetPosePanel } from "./PresetPosePanel";
import { InstructionsPanel } from "./InstructionsPanel";
import { ActionButtons, mirrorPose, savePoseToLocalStorage } from "./ActionButtons";
import { GenerateDialog } from "./GenerateDialog";
import { PreviewDialog } from "./PreviewDialog";

const PoseLabEditor = ({ onGenerateWithPose }: PoseLabEditorProps) => {
  const { toast } = useToast();

  // Pose history management
  const {
    pose,
    updatePoseWithHistory,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  } = usePoseHistory(defaultPose);

  // Character loading
  const { characters, isLoadingCharacters } = useCharacterLoader();

  // Preset selection
  const [selectedPreset, setSelectedPreset] = useState<string>("站立");

  // Dialog states
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleReset = () => {
    updatePoseWithHistory(defaultPose);
    setSelectedPreset("站立");
  };

  const handlePresetSelect = (preset: PresetPose) => {
    updatePoseWithHistory(preset.pose);
    setSelectedPreset(preset.name);
  };

  const handleMirror = () => {
    const mirroredPose = mirrorPose(pose);
    updatePoseWithHistory(mirroredPose);
    toast({
      title: "姿势已镜像",
      description: "左右身体部位已翻转",
    });
  };

  const handleSave = () => {
    try {
      const poseName = savePoseToLocalStorage(pose);
      toast({
        title: "姿势已保存",
        description: `"${poseName}" 已保存到浏览器本地`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "保存失败",
        description: error instanceof Error ? error.message : "无法保存姿势",
      });
    }
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

      // 设置生成的图片数据并打开预览对话框
      setGeneratedImage({
        url: data.image.image_url,
        poseName: data.image.pose_name,
        poseDescription: data.image.pose_description,
      });
      setShowPreviewDialog(true);

      toast({
        title: "姿势变体生成成功",
        description: `已为角色"${selectedCharacter?.name}"生成"${data.image.pose_name}"姿势变体`,
      });

      // 关闭生成对话框
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

  const getPoseDescription = () => {
    return selectedPreset
      ? getPresetPoseDescription(selectedPreset)
      : poseToDescription(pose);
  };

  const handleClearGeneratedImage = () => {
    setGeneratedImage(null);
  };

  return (
    <>
      <div className="h-full flex flex-col lg:flex-row gap-4">
        {/* 3D Canvas */}
        <PoseCanvas pose={pose} onPoseChange={updatePoseWithHistory} />

        {/* Controls Panel */}
        <div className="w-full lg:w-80 space-y-4">
          {/* Preset Poses */}
          <PresetPosePanel
            presetPoses={presetPoses}
            selectedPreset={selectedPreset}
            onPresetSelect={handlePresetSelect}
          />

          {/* Instructions */}
          <InstructionsPanel />

          {/* Actions */}
          <ActionButtons
            isLoadingCharacters={isLoadingCharacters}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onMirror={handleMirror}
            onReset={handleReset}
            onSave={handleSave}
            onGenerate={handleGenerate}
            charactersCount={characters.length}
          />
        </div>
      </div>

      {/* Generate Dialog */}
      <GenerateDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        characters={characters}
        selectedCharacterId={selectedCharacterId}
        onCharacterSelect={setSelectedCharacterId}
        poseDescription={getPoseDescription()}
        isGenerating={isGenerating}
        onConfirm={handleConfirmGenerate}
      />

      {/* Preview Dialog */}
      <PreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        generatedImage={generatedImage}
        onClear={handleClearGeneratedImage}
      />
    </>
  );
};

export default PoseLabEditor;
