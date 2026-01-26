"use client";

/**
 * 角色 Prompt 编辑器对话框
 * 
 * 用于创建和编辑角色身份证 Prompt
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  STYLE_PRESETS,
  VARIANT_PRESETS,
  DEFAULT_NEGATIVE_PROMPT,
  buildFullPrompt,
} from "@/types/character-prompt";
import type { CharacterPromptTemplate, CharacterPromptVersion } from "@/types/character-prompt";

interface CharacterPromptEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characterId: string;
  characterName: string;
  templateId: string | null; // null = 新建
  mode: "create_base" | "create_variant" | "edit";
  onSuccess: () => void;
}

export function CharacterPromptEditorDialog({
  open,
  onOpenChange,
  characterId,
  characterName,
  templateId,
  mode,
  onSuccess,
}: CharacterPromptEditorDialogProps) {
  // 表单状态
  const [version, setVersion] = useState<CharacterPromptVersion>(
    mode === "create_variant" ? "variant" : "base"
  );
  const [variantName, setVariantName] = useState("");
  const [appearancePrompt, setAppearancePrompt] = useState("");
  const [clothingPrompt, setClothingPrompt] = useState("");
  const [stylePrompt, setStylePrompt] = useState<string>(STYLE_PRESETS[0].value);
  const [characteristicPrompt, setCharacteristicPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState(DEFAULT_NEGATIVE_PROMPT);
  const [userGuidance, setUserGuidance] = useState("");

  // 获取现有模板数据（编辑模式）
  const { data: templateData, isLoading: templateLoading } = useQuery({
    queryKey: ["character-prompt-template", templateId],
    queryFn: async () => {
      const res = await fetch(`/api/canvas/character-prompt/${templateId}`);
      if (!res.ok) throw new Error("获取模板失败");
      return res.json();
    },
    enabled: !!templateId && mode === "edit",
  });

  // 初始化表单数据（编辑模式）
  useEffect(() => {
    if (templateData?.template) {
      const t = templateData.template as CharacterPromptTemplate;
      setVersion(t.version);
      setVariantName(t.variant_name || "");
      setAppearancePrompt(t.appearance_prompt);
      setClothingPrompt(t.clothing_prompt);
      setStylePrompt(t.style_prompt);
      setCharacteristicPrompt(t.characteristic_prompt || "");
      setNegativePrompt(t.negative_prompt);
    }
  }, [templateData]);

  // 重置表单（新建模式）
  useEffect(() => {
    if (open && mode !== "edit") {
      setVersion(mode === "create_variant" ? "variant" : "base");
      setVariantName("");
      setAppearancePrompt("");
      setClothingPrompt("");
      setStylePrompt(STYLE_PRESETS[0].value);
      setCharacteristicPrompt("");
      setNegativePrompt(DEFAULT_NEGATIVE_PROMPT);
      setUserGuidance("");
    }
  }, [open, mode]);

  // 计算完整 Prompt 预览
  const fullPromptPreview = useMemo(() => {
    return buildFullPrompt({
      appearance_prompt: appearancePrompt,
      clothing_prompt: clothingPrompt,
      style_prompt: stylePrompt,
      characteristic_prompt: characteristicPrompt,
      negative_prompt: negativePrompt,
    });
  }, [appearancePrompt, clothingPrompt, stylePrompt, characteristicPrompt, negativePrompt]);

  // AI 生成 Prompt
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/canvas/character-prompt/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          version,
          variant_name: version === "variant" ? variantName : undefined,
          user_guidance: userGuidance || undefined,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "生成失败");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      const t = data.template as CharacterPromptTemplate;
      setAppearancePrompt(t.appearance_prompt);
      setClothingPrompt(t.clothing_prompt);
      setStylePrompt(t.style_prompt);
      setCharacteristicPrompt(t.characteristic_prompt || "");
      setNegativePrompt(t.negative_prompt);
      toast.success("AI 生成完成");
      onSuccess();
    },
    onError: (error) => {
      toast.error("生成失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    },
  });

  // 更新 Prompt
  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/canvas/character-prompt/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appearance_prompt: appearancePrompt,
          clothing_prompt: clothingPrompt,
          style_prompt: stylePrompt,
          characteristic_prompt: characteristicPrompt || undefined,
          negative_prompt: negativePrompt,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新失败");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast.success("保存成功");
      onSuccess();
    },
    onError: (error) => {
      toast.error("保存失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    },
  });

  // 处理 AI 生成
  const handleGenerate = useCallback(() => {
    if (version === "variant" && !variantName.trim()) {
      toast.error("请输入变体名称");
      return;
    }
    generateMutation.mutate();
  }, [version, variantName, generateMutation]);

  // 处理保存
  const handleSave = useCallback(() => {
    if (!appearancePrompt.trim() || !clothingPrompt.trim() || !stylePrompt.trim()) {
      toast.error("请填写必填字段", {
        description: "外貌、服装和画风 Prompt 不能为空",
      });
      return;
    }
    updateMutation.mutate();
  }, [appearancePrompt, clothingPrompt, stylePrompt, updateMutation]);

  // 判断是否可以保存
  const canSave = useMemo(() => {
    return (
      appearancePrompt.trim() !== "" &&
      clothingPrompt.trim() !== "" &&
      stylePrompt.trim() !== ""
    );
  }, [appearancePrompt, clothingPrompt, stylePrompt]);

  // 判断是否正在处理
  const isProcessing = generateMutation.isPending || updateMutation.isPending;

  // 对话框标题
  const dialogTitle = useMemo(() => {
    if (mode === "edit") return "编辑角色 Prompt";
    if (mode === "create_variant") return "创建变体版本";
    return "生成角色身份证";
  }, [mode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">{dialogTitle}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {characterName} - {version === "base" ? "基础版" : variantName || "变体版"}
          </DialogDescription>
        </DialogHeader>

        {templateLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* 版本选择（仅新建时） */}
            {mode !== "edit" && (
              <div className="space-y-3">
                <Label className="text-white">版本类型</Label>
                <RadioGroup
                  value={version}
                  onValueChange={(v) => setVersion(v as CharacterPromptVersion)}
                  disabled={mode === "create_variant"}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="base" id="base" />
                    <Label htmlFor="base" className="text-zinc-300 cursor-pointer">
                      基础版（默认外观）
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="variant" id="variant" />
                    <Label htmlFor="variant" className="text-zinc-300 cursor-pointer">
                      变体版（特定场景）
                    </Label>
                  </div>
                </RadioGroup>

                {version === "variant" && (
                  <div className="pl-6 space-y-2">
                    <Label className="text-zinc-400 text-sm">变体名称</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="输入变体名称（如：战斗装、正装）"
                        value={variantName}
                        onChange={(e) => setVariantName(e.target.value)}
                        className="flex-1 bg-zinc-900 border-zinc-700"
                      />
                      <Select value={variantName} onValueChange={setVariantName}>
                        <SelectTrigger className="w-[120px] bg-zinc-900 border-zinc-700">
                          <SelectValue placeholder="快速选择" />
                        </SelectTrigger>
                        <SelectContent>
                          {VARIANT_PRESETS.map((preset) => (
                            <SelectItem key={preset.value} value={preset.value}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 用户指导（仅新建时） */}
            {mode !== "edit" && (
              <div className="space-y-2">
                <Label className="text-white">补充说明（可选）</Label>
                <Textarea
                  placeholder="输入额外的角色特征描述，帮助 AI 生成更准确的 Prompt..."
                  value={userGuidance}
                  onChange={(e) => setUserGuidance(e.target.value)}
                  rows={2}
                  className="bg-zinc-900 border-zinc-700"
                />
              </div>
            )}

            {/* AI 生成按钮（仅新建时） */}
            {mode !== "edit" && (
              <Button
                onClick={handleGenerate}
                disabled={isProcessing || (version === "variant" && !variantName.trim())}
                className="w-full"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI 生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI 自动生成 Prompt
                  </>
                )}
              </Button>
            )}

            <Separator className="bg-zinc-800" />

            {/* Prompt 组成部分 */}
            <div className="space-y-4">
              <div>
                <Label className="text-white">
                  外貌 Prompt <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  placeholder="发型、脸型、肤色、身高、体型..."
                  value={appearancePrompt}
                  onChange={(e) => setAppearancePrompt(e.target.value)}
                  rows={3}
                  className="mt-2 bg-zinc-900 border-zinc-700 font-mono text-sm"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  示例: long silver hair, blue eyes, slender build, 170cm tall, fair skin
                </p>
              </div>

              <div>
                <Label className="text-white">
                  服装 Prompt <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  placeholder="服装款式、颜色、配饰..."
                  value={clothingPrompt}
                  onChange={(e) => setClothingPrompt(e.target.value)}
                  rows={3}
                  className="mt-2 bg-zinc-900 border-zinc-700 font-mono text-sm"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  示例: white school uniform, blue tie, black skirt, sneakers
                </p>
              </div>

              <div>
                <Label className="text-white">
                  画风 Prompt <span className="text-red-400">*</span>
                </Label>
                <Select value={stylePrompt} onValueChange={setStylePrompt}>
                  <SelectTrigger className="mt-2 bg-zinc-900 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="或输入自定义画风..."
                  value={
                    STYLE_PRESETS.some((p) => p.value === stylePrompt)
                      ? ""
                      : stylePrompt
                  }
                  onChange={(e) => setStylePrompt(e.target.value)}
                  className="mt-2 bg-zinc-900 border-zinc-700 font-mono text-sm"
                />
              </div>

              <div>
                <Label className="text-white">特征标识 Prompt（可选）</Label>
                <Textarea
                  placeholder="疤痕、纹身、特殊配饰等独特标识..."
                  value={characteristicPrompt}
                  onChange={(e) => setCharacteristicPrompt(e.target.value)}
                  rows={2}
                  className="mt-2 bg-zinc-900 border-zinc-700 font-mono text-sm"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  示例: scar on left cheek, silver earring, dragon tattoo on arm
                </p>
              </div>

              <Separator className="bg-zinc-800" />

              <div>
                <Label className="text-white">负面 Prompt</Label>
                <Textarea
                  placeholder="不希望出现的元素..."
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  rows={2}
                  className="mt-2 bg-zinc-900 border-zinc-700 font-mono text-sm"
                />
              </div>

              <Separator className="bg-zinc-800" />

              {/* 预览完整 Prompt */}
              <div>
                <Label className="text-white">完整 Prompt 预览</Label>
                <div className="mt-2 p-3 bg-zinc-900 rounded border border-zinc-700 text-sm font-mono text-zinc-300 max-h-32 overflow-y-auto">
                  {fullPromptPreview || (
                    <span className="text-zinc-500">填写上方字段后显示预览</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            取消
          </Button>
          {mode === "edit" && (
            <Button onClick={handleSave} disabled={!canSave || isProcessing}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
