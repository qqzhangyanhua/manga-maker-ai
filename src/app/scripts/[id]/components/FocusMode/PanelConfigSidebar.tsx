"use client";

/**
 * 右侧配置面板组件
 * 提供角色选择、提示词编辑、模型配置等功能
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sparkles,
  User,
  Image as ImageIcon,
  Settings,
  RefreshCw,
  Save,
  Wand2,
  Images,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusMode } from "../../contexts/FocusModeContext";
import { ReferenceImageSelector } from "../ReferenceImageSelector";
import type { ReferenceImage } from "../FocusMode/types";
import type { Panel as ScriptPanel } from "../../types/script-editor.types";
import { usePanelImageGeneration } from "../../hooks/usePanelImageGeneration";
import { useScriptData } from "../../providers/ScriptDataProvider";
import { GenerateCharacterImageDialog } from "../GenerateCharacterImageDialog";
import type { Character as PrismaCharacter, Panel as PrismaPanel } from "@prisma/client";
import { useErrorHandler } from "../../hooks/useErrorHandler";
import { useLoadingState } from "../../hooks/useLoadingState";
import { buildCompletePrompt, extractCharacterNames } from "@/lib/panel-prompt-builder";

interface PanelConfigSidebarProps {
  className?: string;
  storyId?: string;
  projectId?: string | null;
}

export function PanelConfigSidebar({ className, storyId, projectId }: PanelConfigSidebarProps) {
  const { state, actions, characters, panels, setPreviewImage, setGenerationState } = useFocusMode();
  const { refetchAll, storyCharacters } = useScriptData();
  const { handleError, handleSuccess } = useErrorHandler();
  const { withLoading, isLoadingKey } = useLoadingState({ timeout: 120000 }); // 2分钟超时

  // 使用共享的图片生成 Hook
  const {
    isGenerating,
    generateImage,
  } = usePanelImageGeneration({
    onSuccess: (imageUrl) => {
      setPreviewImage?.(imageUrl);
      setGenerationState?.(false, 0);
      handleSuccess("图片生成成功", "已自动保存到当前分镜");
    },
    onPanelUpdate: refetchAll,
    onError: (error) => {
      setGenerationState?.(false, 0);
      handleError(error, "图片生成");
    },
  });

  // 本地编辑状态
  const [localPrompt, setLocalPrompt] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 参考图选择器状态
  const [referenceImageSelectorOpen, setReferenceImageSelectorOpen] = useState(false);

  // 角色图片生成对话框状态
  const [generateImageDialogOpen, setGenerateImageDialogOpen] = useState(false);
  const [selectedCharacterForGeneration, setSelectedCharacterForGeneration] = useState<PrismaCharacter | null>(null);

  // 同步当前面板数据到本地状态
  useEffect(() => {
    if (state.currentPanel) {
      setLocalPrompt(state.currentPanel.prompt_used || "");
      setLocalDescription(state.currentPanel.description || "");
      setHasUnsavedChanges(false);
    }
  }, [state.currentPanel]);

  const handlePromptChange = (value: string) => {
    setLocalPrompt(value);
    setHasUnsavedChanges(true);
  };

  const handleDescriptionChange = (value: string) => {
    setLocalDescription(value);
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    await withLoading(async () => {
      try {
        if (localDescription !== state.currentPanel?.description) {
          await actions.updatePanelDescription(localDescription);
        }
        if (localPrompt !== state.currentPanel?.prompt_used) {
          await actions.updatePanelPrompt(localPrompt);
        }
        setHasUnsavedChanges(false);
        handleSuccess("保存成功", "分镜信息已更新");
      } catch (error) {
        handleError(error, "保存分镜");
      }
    }, "save-panel");
  };

  const handleResetConfig = () => {
    actions.resetConfig();
  };

  // 处理图片生成
  const handleGenerateImage = async () => {
    if (!state.currentPanel) return;

    // 开始生成时设置状态
    setGenerationState?.(true, 0);

    // 🎯 方案 A + B: 智能选择基础提示词
    // 优先级: customPrompt > description > visual_prompt
    // 避免使用 prompt_used（可能包含旧的增强指令）
    let basePrompt = state.config.customPrompt;
    
    if (!basePrompt) {
      // 转换 Panel 类型为兼容格式
      const panelData = {
        description: state.currentPanel.description,
        visual_prompt: null, // FocusModePanel 没有 visual_prompt
        prompt_used: state.currentPanel.prompt_used,
      };
      
      // 使用 description，避免 prompt_used
      basePrompt = panelData.description || panelData.prompt_used || "Generate comic panel image";
    }

    // 🎨 方案 A: 智能收集角色参考图（从选中的角色）
    const selectedCharacterRefs = await collectCharacterReferenceImages(
      state.config.selectedCharacters,
      state.config.referenceImages
    );

    // 🎨 方案 B: 从描述中提取角色名称并查找参考图
    const extractedCharacterRefs = await collectCharacterRefsFromDescription(
      basePrompt,
      state.config.selectedCharacters
    );

    // 合并两种方案的参考图（去重）
    const allReferenceImages = mergeReferenceImages(
      selectedCharacterRefs,
      extractedCharacterRefs
    );

    // 🎯 使用提示词构建器构建完整提示词
    const selectedCharacters = characters.filter((c) =>
      state.config.selectedCharacters.includes(c.id)
    );

    const promptPanel = {
      ...state.currentPanel,
      description: basePrompt,
      camera_angle: null,
      shot_size: null,
    } as unknown as PrismaPanel;

    const enhancedPrompt = buildCompletePrompt(
      promptPanel,
      selectedCharacters as unknown as PrismaCharacter[],
      {
        preferredSource: "description",
        includeCameraInfo: false,
        includeStyleInstructions: true,
        hasReferenceImages: allReferenceImages.length > 0,
        customStyle: "Japanese manga/comic style",
      }
    );

    console.log("📝 生成配置:", {
      basePrompt: basePrompt.substring(0, 100) + "...",
      selectedCharacters: selectedCharacters.map((c) => c.name),
      referenceImageCount: allReferenceImages.length,
      enhancedPromptLength: enhancedPrompt.length,
    });

    await withLoading(async () => {
      try {
        await generateImage(state.currentPanel.id, {
          customPrompt: enhancedPrompt,
          negativePrompt: state.config.negativePrompt,
          modelName: state.config.modelName,
          aspectRatio: state.config.aspectRatio,
          numInferenceSteps: state.config.numInferenceSteps,
          guidanceScale: state.config.guidanceScale,
          referenceImages: allReferenceImages,
        });
      } catch (error) {
        // 错误处理已在 Hook 中完成，这里确保状态重置
        setGenerationState?.(false, 0);
      }
    }, `generate-${state.currentPanel.id}`);
  };

  /**
   * 方案 B: 从描述中提取角色名称并查找参考图
   */
  const collectCharacterRefsFromDescription = async (
    description: string,
    excludeIds: string[]
  ): Promise<ReferenceImage[]> => {
    const result: ReferenceImage[] = [];

    // 提取角色名称
    const characterNames = extractCharacterNames(description);
    if (characterNames.length === 0) {
      return result;
    }

    console.log(`🔍 从描述中提取到角色名称: ${characterNames.join(", ")}`);

    // 查找匹配的角色（排除已选中的）
    for (const name of characterNames) {
      const character = characters.find(
        (c) => c.name === name && !excludeIds.includes(c.id)
      );

      if (character) {
        const referenceUrl = character.reference_image || character.base_image_url;
        if (referenceUrl) {
          result.push({
            id: `extracted-${character.id}`,
            url: referenceUrl,
            label: `提取的角色: ${character.name}`,
            source: "character",
          });
          console.log(`✓ 自动添加角色参考图: ${character.name} → ${referenceUrl}`);
        }
      }
    }

    return result;
  };

  /**
   * 合并参考图并去重
   */
  const mergeReferenceImages = (
    ...imageLists: ReferenceImage[][]
  ): ReferenceImage[] => {
    const seen = new Set<string>();
    const result: ReferenceImage[] = [];

    for (const list of imageLists) {
      for (const img of list) {
        if (!seen.has(img.url)) {
          seen.add(img.url);
          result.push(img);
        }
      }
    }

    return result;
  };

  /**
   * 智能收集角色参考图
   * 将用户选择的角色参考图与手动选择的参考图合并
   */
  const collectCharacterReferenceImages = async (
    selectedCharacterIds: string[],
    manualReferenceImages: ReferenceImage[]
  ): Promise<ReferenceImage[]> => {
    const result: ReferenceImage[] = [...manualReferenceImages];

    // 遍历选中的角色，获取它们的参考图
    for (const characterId of selectedCharacterIds) {
      const character = characters.find((c) => c.id === characterId);
      if (!character) continue;

      // 查找角色的最佳参考图（优先级：reference_image → base_image_url）
      const referenceUrl = character.reference_image || character.base_image_url;
      if (referenceUrl) {
        // 检查是否已存在（避免重复）
        const exists = result.some((img) => img.url === referenceUrl);
        if (!exists) {
          result.push({
            id: `character-${characterId}`,
            url: referenceUrl,
            label: `角色: ${character.name}`,
            source: "character",
          });
          console.log(`✓ 添加角色参考图: ${character.name} → ${referenceUrl}`);
        }
      } else {
        console.warn(`⚠️ 角色 ${character.name} 没有可用的参考图`);
      }
    }

    console.log(`✓ 共收集 ${result.length} 张参考图（${manualReferenceImages.length} 手动 + ${result.length - manualReferenceImages.length} 角色）`);
    return result;
  };

  // 过滤出当前故事关联的角色
  const storyCharacterIds = new Set(storyCharacters.map(sc => sc.character_id));
  const filteredCharacters = characters.filter(char => storyCharacterIds.has(char.id));

  // 打开角色图片生成对话框
  const handleOpenGenerateDialog = (character: PrismaCharacter) => {
    setSelectedCharacterForGeneration(character);
    setGenerateImageDialogOpen(true);
  };

  // 图片生成成功回调
  const handleGenerationSuccess = async () => {
    await refetchAll();
  };

  // 图像生成模型选项
  const modelOptions = [
    { value: "Nano-Banana-Pro", label: "Nano-Banana-Pro" },
    { value: "Nano-Banana", label: "Nano-Banana" },
    { value: "图梦4.0", label: "图梦4.0" },
  ];

  // 宽高比选项
  const aspectRatioOptions = [
    { value: "1:1", label: "1:1 正方形" },
    { value: "16:9", label: "16:9 横向" },
    { value: "9:16", label: "9:16 纵向" },
    { value: "4:3", label: "4:3 标准" },
    { value: "3:4", label: "3:4 竖版" },
  ];

  return (
    <div className={cn("flex flex-col h-full bg-[#16161a] border-l border-gray-800", className)}>
      {/* 标题栏 */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Settings className="w-4 h-4" />
            配置面板
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetConfig}
            className="text-gray-400 hover:text-white h-7 px-2"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            重置
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* 分镜描述编辑 */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-300 flex items-center gap-2">
              <ImageIcon className="w-3 h-3" />
              分镜描述
            </Label>
            <Textarea
              id="description"
              value={localDescription}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="描述这个分镜的内容..."
              className="min-h-[100px] bg-black/30 border-gray-700 text-white resize-none"
            />
          </div>

          {/* 提示词编辑 */}
          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-gray-300 flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-orange-400" />
              AI 提示词
            </Label>
            <Textarea
              id="prompt"
              value={localPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder="输入 AI 图像生成提示词..."
              className="min-h-[120px] bg-black/30 border-gray-700 text-white font-mono text-sm resize-none"
            />
          </div>

          {/* 保存按钮 */}
          {hasUnsavedChanges && (
            <Button
              onClick={handleSaveChanges}
              disabled={isLoadingKey("save-panel")}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoadingKey("save-panel") ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存修改
                </>
              )}
            </Button>
          )}

          {/* 高级配置手风琴 */}
          <Accordion type="multiple" defaultValue={["reference", "characters", "model"]} className="w-full">
            {/* 参考图选择 */}
            <AccordionItem value="reference" className="border-gray-800">
              <AccordionTrigger className="text-sm text-gray-300 hover:text-white py-3">
                <div className="flex items-center gap-2">
                  <Images className="w-4 h-4" />
                  参考图片
                  {state.config.referenceImages.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {state.config.referenceImages.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReferenceImageSelectorOpen(true)}
                  className="w-full border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white"
                >
                  <Images className="w-4 h-4 mr-2" />
                  {state.config.referenceImages.length > 0
                    ? `已选择 ${state.config.referenceImages.length} 张`
                    : "选择参考图"}
                </Button>
                
                {/* 已选参考图预览 */}
                {state.config.referenceImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {state.config.referenceImages.map((img, index) => (
                      <div key={img.id} className="relative group">
                        <div className="aspect-square rounded overflow-hidden bg-gray-900">
                          <img
                            src={img.url}
                            alt={img.label || `参考图 ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => {
                            actions.updateConfig({
                              referenceImages: state.config.referenceImages.filter(
                                (_, i) => i !== index
                              ),
                            });
                          }}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-gray-500">
                  参考图可以引导 AI 生成更符合预期的图片
                </p>
              </AccordionContent>
            </AccordionItem>
            
            {/* 角色选择 */}
            <AccordionItem value="characters" className="border-gray-800">
              <AccordionTrigger className="text-sm text-gray-300 hover:text-white py-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  出场角色
                  {state.config.selectedCharacters.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {state.config.selectedCharacters.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 space-y-2">
                {/* 提示信息 */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-3">
                  <p className="text-xs text-blue-400">
                    💡 选择的角色将自动使用其参考图生成，保持人物外观一致
                  </p>
                </div>
                {filteredCharacters.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredCharacters.map((character) => {
                      const isSelected = state.config.selectedCharacters.includes(character.id);
                      const hasImage = character.reference_image || character.base_image_url;
                      
                      return (
                        <div key={character.id} className="relative">
                          <button
                            onClick={() => {
                              const newSelection = isSelected
                                ? state.config.selectedCharacters.filter((id) => id !== character.id)
                                : [...state.config.selectedCharacters, character.id];
                              actions.updateConfig({ selectedCharacters: newSelection });
                            }}
                            className={cn(
                              "flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all w-full",
                              isSelected
                                ? "border-orange-500 bg-orange-500/10"
                                : "border-gray-700 bg-black/30 hover:border-gray-600"
                            )}
                          >
                            {hasImage ? (
                              <div className="w-full aspect-square rounded overflow-hidden">
                                <img
                                  src={character.reference_image || character.base_image_url || ""}
                                  alt={character.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-full aspect-square rounded bg-gray-800 flex items-center justify-center">
                                <User className="w-6 h-6 text-gray-600" />
                              </div>
                            )}
                            <span className="text-xs text-white truncate w-full text-center">
                              {character.name}
                            </span>
                          </button>
                          
                          {/* 生成图片按钮 - 仅当角色没有图片时显示 */}
                          {!hasImage && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenGenerateDialog(character as PrismaCharacter);
                              }}
                              disabled={isGenerating}
                              className="absolute bottom-1 right-1 p-1.5 bg-orange-500 hover:bg-orange-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title={character.description ? `根据描述生成: ${character.description.slice(0, 30)}...` : "生成角色图片"}
                            >
                              <Sparkles className="w-3 h-3 text-white" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">
                    当前故事暂无关联角色
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* 模型配置 */}
            <AccordionItem value="model" className="border-gray-800">
              <AccordionTrigger className="text-sm text-gray-300 hover:text-white py-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  图片模型选择
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">模型</Label>
                  <Select
                    value={state.config.modelName}
                    onValueChange={(value) => actions.updateConfig({ modelName: value })}
                  >
                    <SelectTrigger className="bg-black/30 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {modelOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">宽高比</Label>
                  <Select
                    value={state.config.aspectRatio}
                    onValueChange={(value) => actions.updateConfig({ aspectRatio: value })}
                  >
                    <SelectTrigger className="bg-black/30 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aspectRatioOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 高级参数 */}
            <AccordionItem value="advanced" className="border-gray-800">
              <AccordionTrigger className="text-sm text-gray-300 hover:text-white py-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  高级参数
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">
                    推理步数: {state.config.numInferenceSteps}
                  </Label>
                  <Input
                    type="range"
                    min="20"
                    max="100"
                    step="5"
                    value={state.config.numInferenceSteps}
                    onChange={(e) =>
                      actions.updateConfig({ numInferenceSteps: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    步数越多，图片质量越高，但生成时间越长
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">
                    引导强度: {state.config.guidanceScale}
                  </Label>
                  <Input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={state.config.guidanceScale}
                    onChange={(e) =>
                      actions.updateConfig({ guidanceScale: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    值越高，生成结果越贴近提示词
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="negative-prompt" className="text-xs text-gray-400">
                    负面提示词
                  </Label>
                  <Textarea
                    id="negative-prompt"
                    value={state.config.negativePrompt}
                    onChange={(e) => actions.updateConfig({ negativePrompt: e.target.value })}
                    placeholder="描述不想出现的内容..."
                    className="min-h-[60px] bg-black/30 border-gray-700 text-white text-xs resize-none"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>

      {/* 底部操作按钮 */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        <Button
          onClick={handleGenerateImage}
          disabled={isGenerating || !state.currentPanel}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              生成图片
            </>
          )}
        </Button>

        {state.currentPanel?.generated_image && (
          <Button
            onClick={actions.deletePanelImage}
            variant="outline"
            className="w-full text-red-400 border-red-400/50 hover:bg-red-400/10"
          >
            删除当前图片
          </Button>
        )}
      </div>
      
      {/* 参考图选择器对话框 */}
      {storyId && (
        <ReferenceImageSelector
          open={referenceImageSelectorOpen}
          storyId={storyId}
          projectId={projectId}
          panels={panels as unknown as ScriptPanel[]}
          onOpenChange={setReferenceImageSelectorOpen}
          onConfirm={(images) => {
            actions.updateConfig({ referenceImages: images });
            setReferenceImageSelectorOpen(false);
          }}
        />
      )}

      {/* 角色图片生成对话框 */}
      <GenerateCharacterImageDialog
        open={generateImageDialogOpen}
        onOpenChange={setGenerateImageDialogOpen}
        character={selectedCharacterForGeneration}
        onSuccess={handleGenerationSuccess}
      />
    </div>
  );
}

