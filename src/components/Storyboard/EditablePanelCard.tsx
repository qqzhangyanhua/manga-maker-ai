import { useState, useEffect, MouseEvent } from "react";
import { cn } from "@/lib/utils";
import {
  Camera,
  Image as ImageIcon,
  Pencil,
  Check,
  X,
  Merge,
  Split,
  Plus,
  Sparkles,
  Save,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { OperationLoadingState } from "@/types/storyboard";
import type { StoryboardCharacter, StoryboardStyle } from "@/hooks/use-storyboard-data";

type Panel = {
  id: string;
  panel_order: number;
  panel_type: string;
  importance: string;
  description: string;
  visual_prompt: string | null;
  dialogue: string | null;
  character_id: string | null; // FK to Character table
  character?: { id: string; name: string } | null; // Joined character data
  emotion: string | null;
  generated_image: string | null;
  prompt_used: string | null;
  script_segment_id: string | null;
  script_start: number | null;
  script_end: number | null;
  camera_angle: string | null;
  shot_size: string | null;
  sketch_image_url: string | null;
};

interface EditablePanelCardProps {
  panel: Panel;
  isSelected: boolean;
  onClick: () => void;
  onUpdate: (updates: Partial<Panel>) => void;
  onMerge?: (panelId: string) => void;
  onSplit?: (panelId: string) => void;
  onInsertAfter?: (panelOrder: number) => void;
  onGenerateSketch?: (panelId: string, characterId?: string) => void;
  onGeneratePrompt?: (panelId: string, opts?: { characterId?: string; styleKey?: string }) => void;
  onSelectionChange?: (panelId: string, selection: { characterId?: string; styleKey?: string }) => void;
  operationLoading?: OperationLoadingState;
  selection?: { characterId?: string; styleKey?: string };
  characters?: StoryboardCharacter[];
  styles?: StoryboardStyle[];
}

const CAMERA_ANGLES = [
  { value: "平视", label: "平视" },
  { value: "俯视", label: "俯视" },
  { value: "仰视", label: "仰视" },
  { value: "荷兰角", label: "荷兰角" },
];

const SHOT_SIZES = [
  { value: "特写", label: "特写" },
  { value: "近景", label: "近景" },
  { value: "中景", label: "中景" },
  { value: "全景", label: "全景" },
  { value: "远景", label: "远景" },
];

const NO_SELECTION_VALUE = "__none__";

const EditablePanelCard = ({
  panel,
  isSelected,
  onClick,
  onUpdate,
  onMerge,
  onSplit,
  onInsertAfter,
  onGenerateSketch,
  onGeneratePrompt,
  operationLoading,
  onSelectionChange,
  selection,
  characters = [],
  styles = [],
}: EditablePanelCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(panel.visual_prompt || panel.description);
  const [editedDialogue, setEditedDialogue] = useState(panel.dialogue || "");
  const [cameraAngle, setCameraAngle] = useState(panel.camera_angle || "平视");
  const [shotSize, setShotSize] = useState(panel.shot_size || "中景");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState(selection?.characterId);
  const [selectedStyleKey, setSelectedStyleKey] = useState(selection?.styleKey);
  const { toast } = useToast();

  useEffect(() => {
    setEditedPrompt(panel.visual_prompt || panel.description);
    setEditedDialogue(panel.dialogue || "");
    setCameraAngle(panel.camera_angle || "平视");
    setShotSize(panel.shot_size || "中景");
    setHasUnsavedChanges(false);
    setSelectedCharacterId(selection?.characterId);
    setSelectedStyleKey(selection?.styleKey);
  }, [panel, selection]);

  // 自动保存逻辑（500ms debounce）
  const debouncedAutoSave = useDebouncedCallback(async () => {
    if (!hasUnsavedChanges || !isEditing) return;
    
    setIsSaving(true);
    await onUpdate({
      visual_prompt: editedPrompt,
      dialogue: editedDialogue || null,
      camera_angle: cameraAngle,
      shot_size: shotSize,
    });
    setIsSaving(false);
    setHasUnsavedChanges(false);
  }, 500);

  // 监听字段变化，触发自动保存
  useEffect(() => {
    if (isEditing) {
      setHasUnsavedChanges(true);
      debouncedAutoSave();
    }
  }, [editedPrompt, editedDialogue, cameraAngle, shotSize, isEditing, debouncedAutoSave]);

  const handleSave = () => {
    onUpdate({
      visual_prompt: editedPrompt,
      dialogue: editedDialogue || null,
      camera_angle: cameraAngle,
      shot_size: shotSize,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedPrompt(panel.visual_prompt || panel.description);
    setEditedDialogue(panel.dialogue || "");
    setCameraAngle(panel.camera_angle || "平视");
    setShotSize(panel.shot_size || "中景");
    setIsEditing(false);
  };

  const handleCopyPrompt = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!panel.prompt_used) return;
    try {
      await navigator.clipboard.writeText(panel.prompt_used);
      toast({
        title: "已复制提示词",
        description: "现在可以直接粘贴到图片生成接口使用",
      });
    } catch (err) {
      console.error("Copy prompt failed:", err);
      toast({
        title: "复制失败",
        description: "当前环境不支持剪贴板复制，请手动选择文本",
        variant: "destructive",
      });
    }
  };

  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId);
  const selectedStyle = styles.find((s) => s.style_key === selectedStyleKey);
  const viewWarning =
    selectedCharacter && selectedCharacter.viewCount === 0
      ? "该角色缺少三视图，可能影响角色一致性"
      : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border-2 transition-all duration-200",
        isSelected
          ? "border-primary shadow-lg ring-2 ring-primary/20"
          : "border-border hover:border-primary/50"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            #{panel.panel_order}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              分镜 {panel.panel_order}
            </div>
            <div className="text-xs text-muted-foreground">
              {panel.panel_type} · {panel.importance}
            </div>
          </div>
          {isSaving && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Save className="w-3 h-3 animate-pulse" />
              保存中...
            </div>
          )}
          {hasUnsavedChanges && !isSaving && isEditing && (
            <div className="text-xs text-yellow-600 dark:text-yellow-500">
              未保存
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant={isEditing ? "default" : "ghost"}
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(!isEditing);
          }}
        >
          <Pencil className="w-4 h-4" />
          {isEditing ? "编辑中" : "编辑"}
        </Button>
      </div>

      {/* Image Preview */}
      <div className="relative aspect-video bg-muted">
        {panel.generated_image ? (
          <img
            src={panel.generated_image}
            alt={`Panel ${panel.panel_order}`}
            className="w-full h-full object-cover"
          />
        ) : panel.sketch_image_url ? (
          <img
            src={panel.sketch_image_url}
            alt={`Sketch ${panel.panel_order}`}
            className="w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="w-12 h-12" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* 角色/风格选择 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
              锁脸角色
            </label>
            <Select
              value={selectedCharacterId ?? NO_SELECTION_VALUE}
              onValueChange={(value) => {
                const val = value === NO_SELECTION_VALUE ? undefined : value;
                setSelectedCharacterId(val);
                onSelectionChange?.(panel.id, { characterId: val, styleKey: selectedStyleKey });
              }}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="不锁定" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SELECTION_VALUE}>不锁定</SelectItem>
                {characters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.viewCount === 0 ? "（缺三视图）" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {viewWarning && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-500">{viewWarning}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
              漫画风格
            </label>
            <Select
              value={selectedStyleKey ?? NO_SELECTION_VALUE}
              onValueChange={(value) => {
                const val = value === NO_SELECTION_VALUE ? undefined : value;
                setSelectedStyleKey(val);
                onSelectionChange?.(panel.id, { characterId: selectedCharacterId, styleKey: val });
              }}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="跟随项目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SELECTION_VALUE}>跟随项目</SelectItem>
                {styles.map((s) => (
                  <SelectItem key={s.style_key} value={s.style_key}>
                    {s.name_zh} ({s.name_en})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStyle && selectedStyle.description && (
              <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                {selectedStyle.description}
              </p>
            )}
          </div>
        </div>

        {/* Camera Settings */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
              <Camera className="w-3 h-3" />
              镜头角度
            </label>
            <Select
              value={cameraAngle}
              onValueChange={(value) => {
                setCameraAngle(value);
                if (!isEditing) {
                  onUpdate({ camera_angle: value });
                }
              }}
              disabled={!isEditing}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMERA_ANGLES.map((angle) => (
                  <SelectItem key={angle.value} value={angle.value}>
                    {angle.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
              <Camera className="w-3 h-3" />
              镜头尺寸
            </label>
            <Select
              value={shotSize}
              onValueChange={(value) => {
                setShotSize(value);
                if (!isEditing) {
                  onUpdate({ shot_size: value });
                }
              }}
              disabled={!isEditing}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHOT_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Visual Prompt */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            视觉描述
          </label>
          {isEditing ? (
            <textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p className="text-sm text-foreground leading-relaxed">
              {editedPrompt}
            </p>
          )}
        </div>

        {/* Dialogue */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            对白
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedDialogue}
              onChange={(e) => setEditedDialogue(e.target.value)}
              placeholder="输入对白..."
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p className="text-sm text-foreground italic">
              {editedDialogue || <span className="text-muted-foreground">（无对白）</span>}
            </p>
          )}
        </div>

        {/* Character & Emotion */}
        {(panel.character_name || panel.emotion) && (
          <div className="text-xs text-muted-foreground">
            {panel.character_name && <span>角色: {panel.character_name}</span>}
            {panel.character_name && panel.emotion && <span> · </span>}
            {panel.emotion && <span>情绪: {panel.emotion}</span>}
          </div>
        )}

        {/* 已生成的提示词 */}
        {panel.prompt_used && (
          <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>AI 提示词</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleCopyPrompt}
              >
                <Copy className="w-3 h-3 mr-1" />
                复制
              </Button>
            </div>
            <pre className="whitespace-pre-wrap break-words text-sm text-foreground">
              {panel.prompt_used}
            </pre>
          </div>
        )}

        {/* Edit Actions */}
        {isEditing && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="default"
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              className="flex-1"
            >
              <Check className="w-4 h-4" />
              保存
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              className="flex-1"
            >
              <X className="w-4 h-4" />
              取消
            </Button>
          </div>
        )}
      </div>

      {/* Panel Operations Footer */}
      {isSelected && (
        <div className="border-t border-border bg-muted/20 px-4 py-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">操作:</span>
            {onGeneratePrompt && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onGeneratePrompt(panel.id, {
                    characterId: selectedCharacterId,
                    styleKey: selectedStyleKey,
                  });
                }}
                disabled={
                  operationLoading?.type === "prompt" && operationLoading?.panelId === panel.id
                }
              >
                <Sparkles
                  className={cn(
                    "w-3 h-3 mr-1",
                    operationLoading?.type === "prompt" &&
                      operationLoading?.panelId === panel.id &&
                      "animate-spin"
                  )}
                />
                {operationLoading?.type === "prompt" && operationLoading?.panelId === panel.id
                  ? "生成中..."
                  : "生成提示词"}
              </Button>
            )}
            {onMerge && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onMerge(panel.id);
                }}
                disabled={
                  operationLoading?.type === "merge" && operationLoading?.panelId === panel.id
                }
              >
                <Merge
                  className={cn(
                    "w-3 h-3 mr-1",
                    operationLoading?.type === "merge" &&
                      operationLoading?.panelId === panel.id &&
                      "animate-spin"
                  )}
                />
                {operationLoading?.type === "merge" && operationLoading?.panelId === panel.id
                  ? "合并中..."
                  : "合并"}
              </Button>
            )}
            {onSplit && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onSplit(panel.id);
                }}
                disabled={
                  operationLoading?.type === "split" && operationLoading?.panelId === panel.id
                }
              >
                <Split
                  className={cn(
                    "w-3 h-3 mr-1",
                    operationLoading?.type === "split" &&
                      operationLoading?.panelId === panel.id &&
                      "animate-spin"
                  )}
                />
                {operationLoading?.type === "split" && operationLoading?.panelId === panel.id
                  ? "拆分中..."
                  : "拆分"}
              </Button>
            )}
            {onInsertAfter && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onInsertAfter(panel.panel_order);
                }}
                disabled={operationLoading?.type === "insert"}
              >
                <Plus
                  className={cn(
                    "w-3 h-3 mr-1",
                    operationLoading?.type === "insert" && "animate-spin"
                  )}
                />
                插入
              </Button>
            )}
            {onGenerateSketch && !panel.sketch_image_url && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs ml-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateSketch(panel.id, selectedCharacterId);
                }}
                disabled={
                  operationLoading?.type === "sketch" && operationLoading?.panelId === panel.id
                }
              >
                <Sparkles
                  className={cn(
                    "w-3 h-3 mr-1",
                    operationLoading?.type === "sketch" &&
                      operationLoading?.panelId === panel.id &&
                      "animate-spin"
                  )}
                />
                {operationLoading?.type === "sketch" && operationLoading?.panelId === panel.id
                  ? "生成中..."
                  : selectedCharacterId ? "生成草图(锁脸)" : "生成草图"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EditablePanelCard;
