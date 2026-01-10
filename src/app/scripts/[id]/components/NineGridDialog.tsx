/**
 * 九宫格图片生成对话框 V2（重构版）
 * 使用 useReducer 集中管理状态，避免无限循环
 */

"use client";

import { useReducer, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Grid3x3, Info, Image as ImageIcon, Palette, CheckSquare } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ==================== 类型定义 ====================

interface Chapter {
  id: string;
  title: string;
  chapter_order: number;
  summary?: string | null;
}

interface Panel {
  id: string;
  panel_order: number;
  description: string;
  visual_prompt: string;
  generated_image?: string;
}

interface ComicStyle {
  id: string;
  style_key: string;
  name_zh: string;
  name_en: string;
  prompt_prefix?: string | null;
  image_url?: string | null;
}

interface CharacterAsset {
  id: string;
  name: string;
  base_image_url: string | null;
  comic_style?: ComicStyle | null;
}

interface NineGridDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  projectId: string | null;
  chapters: Chapter[];
  onSuccess: () => void;
}

// ==================== 状态管理 ====================

interface DialogState {
  // 数据加载状态
  chapterPanels: Panel[];
  isLoadingPanels: boolean;
  comicStyles: ComicStyle[];
  isLoadingStyles: boolean;
  characterAssets: CharacterAsset[];
  isLoadingAssets: boolean;
  
  // 选择状态
  selectedChapterId: string;
  selectedPanelIds: string[];
  
  // 生成状态
  isGenerating: boolean;
}

type DialogAction =
  | { type: "SET_CHAPTER"; chapterId: string }
  | { type: "SET_PANELS"; panels: Panel[] }
  | { type: "SET_LOADING_PANELS"; loading: boolean }
  | { type: "SET_STYLES"; styles: ComicStyle[] }
  | { type: "SET_LOADING_STYLES"; loading: boolean }
  | { type: "SET_ASSETS"; assets: CharacterAsset[] }
  | { type: "SET_LOADING_ASSETS"; loading: boolean }
  | { type: "TOGGLE_PANEL"; panelId: string }
  | { type: "SELECT_FIRST_9" }  // ✅ 移除 panels 参数，从 state 直接获取
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_GENERATING"; generating: boolean }
  | { type: "RESET" };

const initialState: DialogState = {
  chapterPanels: [],
  isLoadingPanels: false,
  comicStyles: [],
  isLoadingStyles: false,
  characterAssets: [],
  isLoadingAssets: false,
  selectedChapterId: "",
  selectedPanelIds: [],
  isGenerating: false,
};

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "SET_CHAPTER":
      // 切换章节时，清空分镜选择
      return {
        ...state,
        selectedChapterId: action.chapterId,
        selectedPanelIds: [],
        chapterPanels: [],
      };
      
    case "SET_PANELS":
      return {
        ...state,
        chapterPanels: action.panels,
      };
      
    case "SET_LOADING_PANELS":
      return {
        ...state,
        isLoadingPanels: action.loading,
      };
      
    case "SET_STYLES":
      return {
        ...state,
        comicStyles: action.styles,
      };
      
    case "SET_LOADING_STYLES":
      return {
        ...state,
        isLoadingStyles: action.loading,
      };
      
    case "SET_ASSETS":
      return {
        ...state,
        characterAssets: action.assets,
      };
      
    case "SET_LOADING_ASSETS":
      return {
        ...state,
        isLoadingAssets: action.loading,
      };
      
    case "TOGGLE_PANEL": {
      const { panelId } = action;
      const { selectedPanelIds } = state;
      
      if (selectedPanelIds.includes(panelId)) {
        // 取消选择
        return {
          ...state,
          selectedPanelIds: selectedPanelIds.filter((id) => id !== panelId),
        };
      } else if (selectedPanelIds.length < 9) {
        // 添加选择
        return {
          ...state,
          selectedPanelIds: [...selectedPanelIds, panelId],
        };
      }
      return state;
    }
      
    case "SELECT_FIRST_9": {
      // ✅ 直接从 state 获取 chapterPanels，不需要从 action 传递
      const first9 = state.chapterPanels.slice(0, 9).map((p) => p.id);
      return {
        ...state,
        selectedPanelIds: first9,
      };
    }
      
    case "CLEAR_SELECTION":
      return {
        ...state,
        selectedPanelIds: [],
      };
      
    case "SET_GENERATING":
      return {
        ...state,
        isGenerating: action.generating,
      };
      
    case "RESET":
      return initialState;
      
    default:
      return state;
  }
}

// ==================== 表单验证 ====================

const formSchema = z.object({
  chapterId: z.string().min(1, "请选择章节"),
  comicStyleId: z.string().optional(),
  referenceImageId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// ==================== 主组件 ====================

export function NineGridDialog({
  open,
  onOpenChange,
  storyId,
  projectId,
  chapters,
  onSuccess,
}: NineGridDialogProps) {
  const { toast } = useToast();
  const [state, dispatch] = useReducer(dialogReducer, initialState);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      chapterId: "",
      comicStyleId: "none",
      referenceImageId: "none",
    },
  });

  // ==================== 数据加载 ====================

  const loadChapterPanels = useCallback(async (chapterId: string) => {
    dispatch({ type: "SET_LOADING_PANELS", loading: true });
    try {
      const response = await fetch(`/api/chapter/${chapterId}/panels`);
      if (response.ok) {
        const data = await response.json();
        const panels = data.panels || [];
        
        // 设置分镜数据
        dispatch({ type: "SET_PANELS", panels });
        
        // ✅ 自动选择前9个分镜（如果有足够的分镜）
        if (panels.length >= 9) {
          dispatch({ type: "SELECT_FIRST_9" });
        } else if (panels.length > 0 && panels.length < 9) {
          // 提示用户分镜不足
          toast({
            title: "提示",
            description: `当前章节有 ${panels.length} 个分镜，少于 9 个，无法生成九宫格`,
            variant: "default",
          });
        }
      }
    } catch (error) {
      console.error("加载章节分镜失败:", error);
      toast({
        title: "加载失败",
        description: "无法加载章节分镜",
        variant: "destructive",
      });
    } finally {
      dispatch({ type: "SET_LOADING_PANELS", loading: false });
    }
  }, [toast]);

  const loadComicStyles = useCallback(async () => {
    dispatch({ type: "SET_LOADING_STYLES", loading: true });
    try {
      const response = await fetch("/api/comic-styles?enabled=true");
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: "SET_STYLES", styles: data.data || [] });
      }
    } catch (error) {
      console.error("加载漫画风格失败:", error);
    } finally {
      dispatch({ type: "SET_LOADING_STYLES", loading: false });
    }
  }, []);

  const loadCharacterAssets = useCallback(async () => {
    dispatch({ type: "SET_LOADING_ASSETS", loading: true });
    try {
      const response = await fetch("/api/character");
      if (response.ok) {
        const data = await response.json();
        const assetsWithImage = (data.characters || []).filter(
          (char: CharacterAsset) => char.base_image_url
        );
        dispatch({ type: "SET_ASSETS", assets: assetsWithImage });
      }
    } catch (error) {
      console.error("加载角色素材失败:", error);
    } finally {
      dispatch({ type: "SET_LOADING_ASSETS", loading: false });
    }
  }, []);

  // ==================== 副作用 ====================

  // ✅ 使用 useRef 存储 form，避免依赖变化
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  // 对话框打开时加载数据
  useEffect(() => {
    if (open) {
      loadComicStyles();
      loadCharacterAssets();
    } else {
      // 关闭时重置状态
      dispatch({ type: "RESET" });
      // ✅ 使用 ref 访问 form，避免依赖 form 对象
      formRef.current.reset();
    }
  }, [open, loadComicStyles, loadCharacterAssets]); // ✅ 移除 form 依赖

  // ✅ 使用 form.watch 的订阅模式，避免在组件顶层调用
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      const newChapterId = value.chapterId;
      
      // 只在章节真正变化时处理
      if (name === "chapterId" && newChapterId && newChapterId !== state.selectedChapterId) {
        dispatch({ type: "SET_CHAPTER", chapterId: newChapterId });
        loadChapterPanels(newChapterId);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, state.selectedChapterId, loadChapterPanels]); // ✅ 明确的依赖

  // ==================== 事件处理 ====================

  // ✅ 使用 useRef 存储最新的 chapterPanels，避免依赖整个数组
  const chapterPanelsRef = useRef<Panel[]>([]);
  useEffect(() => {
    chapterPanelsRef.current = state.chapterPanels;
  }, [state.chapterPanels]);

  const handlePanelToggle = useCallback((panelId: string) => {
    dispatch({ type: "TOGGLE_PANEL", panelId });
  }, []);

  const handleSelectFirst9 = useCallback(() => {
    const panels = chapterPanelsRef.current;
    
    // ✅ 边界条件 1: 没有分镜
    if (panels.length === 0) {
      toast({
        title: "提示",
        description: "当前章节没有分镜，请先生成分镜",
        variant: "default",
      });
      return;
    }
    
    // ✅ 边界条件 2: 分镜少于 9 个
    if (panels.length < 9) {
      toast({
        title: "提示",
        description: `当前章节只有 ${panels.length} 个分镜，少于 9 个`,
        variant: "default",
      });
      return;
    }
    
    // ✅ 正常情况: 选择前 9 个
    dispatch({ type: "SELECT_FIRST_9" });
  }, [dispatch, toast]); // ✅ 稳定的依赖，函数引用不会因为 chapterPanels 变化而改变

  const handleClearSelection = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" });
  }, []);

  const handleSubmit = async (data: FormData) => {
    if (!projectId) {
      toast({
        title: "错误",
        description: "项目 ID 不存在",
        variant: "destructive",
      });
      return;
    }

    if (state.selectedPanelIds.length !== 9) {
      toast({
        title: "错误",
        description: "请选择恰好 9 个分镜",
        variant: "destructive",
      });
      return;
    }

    dispatch({ type: "SET_GENERATING", generating: true });

    try {
      const selectedStyle =
        data.comicStyleId && data.comicStyleId !== "none"
          ? state.comicStyles.find((s) => s.id === data.comicStyleId)
          : undefined;

      const selectedAsset =
        data.referenceImageId && data.referenceImageId !== "none"
          ? state.characterAssets.find((a) => a.id === data.referenceImageId)
          : undefined;

      const response = await fetch(
        `/api/chapter/${data.chapterId}/generate-nine-grid-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            project_id: projectId,
            panel_ids: state.selectedPanelIds,
            comic_style_id: selectedStyle?.id,
            style_prompt: selectedStyle?.prompt_prefix,
            reference_image: selectedAsset?.base_image_url,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "生成失败");
      }

      toast({
        title: "生成成功",
        description: "九宫格图片已生成并保存到素材库",
      });

      dispatch({ type: "RESET" });
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("九宫格生成失败:", error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      dispatch({ type: "SET_GENERATING", generating: false });
    }
  };

  // ==================== 计算值 ====================

  const canSelectFirst9 = useMemo(
    () => state.chapterPanels.length >= 9,
    [state.chapterPanels.length]
  );

  const canClearSelection = useMemo(
    () => state.selectedPanelIds.length > 0,
    [state.selectedPanelIds.length]
  );

  const isValidSelection = useMemo(
    () => state.selectedPanelIds.length === 9,
    [state.selectedPanelIds.length]
  );

  // ==================== 渲染 ====================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3x3 className="w-5 h-5 text-orange-500" />
            九宫格图片生成
          </DialogTitle>
          <DialogDescription>
            选择 9 个分镜，生成 1 张 3×3 九宫格布局的图片
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* 提示信息 */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    九宫格图片将 9 个分镜组合成一张 3×3 布局的图片，展现连续的视觉叙事。
                    选择的分镜将按顺序排列（从左到右，从上到下）。
                  </AlertDescription>
                </Alert>

                {/* 章节选择 */}
                <FormField
                  control={form.control}
                  name="chapterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>选择章节 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择包含分镜的章节" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {chapters.map((chapter) => (
                            <SelectItem key={chapter.id} value={chapter.id}>
                              第 {chapter.chapter_order} 章 - {chapter.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>选择章节后，可以勾选该章节的分镜</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 分镜选择区域 */}
                {state.selectedChapterId && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <CheckSquare className="w-4 h-4" />
                        选择 9 个分镜 *
                        <span className="text-sm font-normal text-muted-foreground">
                          (已选 {state.selectedPanelIds.length}/9)
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSelectFirst9}
                          disabled={!canSelectFirst9}
                        >
                          选择前9个
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleClearSelection}
                          disabled={!canClearSelection}
                        >
                          清空选择
                        </Button>
                      </div>
                    </div>

                    {state.isLoadingPanels ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">
                          加载分镜中...
                        </span>
                      </div>
                    ) : state.chapterPanels.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        该章节暂无分镜，请先生成分镜
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                        {state.chapterPanels.map((panel) => {
                          const isSelected = state.selectedPanelIds.includes(panel.id);
                          const selectionIndex = state.selectedPanelIds.indexOf(panel.id);

                          return (
                            <div
                              key={panel.id}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer",
                                isSelected
                                  ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                                  : "border-transparent bg-muted/30 hover:bg-muted/50"
                              )}
                              onClick={() => handlePanelToggle(panel.id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                disabled={!isSelected && state.selectedPanelIds.length >= 9}
                                className="mt-1 pointer-events-none"
                              />

                              {panel.generated_image && (
                                <img
                                  src={panel.generated_image}
                                  alt={`分镜 ${panel.panel_order}`}
                                  className="w-20 h-20 rounded object-cover"
                                />
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">分镜 {panel.panel_order}</span>
                                  {isSelected && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-orange-500 text-white rounded">
                                      位置 {selectionIndex + 1}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {panel.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground mt-2">
                      点击分镜卡片进行选择，选中的分镜将按顺序排列在九宫格中
                    </p>
                    {!isValidSelection && state.chapterPanels.length > 0 && (
                      <p className="text-sm text-destructive mt-1">请选择恰好 9 个分镜</p>
                    )}
                  </div>
                )}

                {/* 漫画风格选择 */}
                <FormField
                  control={form.control}
                  name="comicStyleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        漫画风格（可选）
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={state.isLoadingStyles}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                state.isLoadingStyles ? "加载中..." : "选择漫画风格"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">不指定风格</SelectItem>
                          {state.comicStyles.map((style) => (
                            <SelectItem key={style.id} value={style.id}>
                              {style.name_zh} ({style.name_en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        选择漫画风格将影响九宫格图片的整体视觉风格
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 参考图选择 */}
                <FormField
                  control={form.control}
                  name="referenceImageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        参考图（可选）
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={state.isLoadingAssets}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                state.isLoadingAssets ? "加载中..." : "从素材库选择参考图"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">不使用参考图</SelectItem>
                          {state.characterAssets.map((asset) => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.name}
                              {asset.comic_style && ` - ${asset.comic_style.name_zh}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        选择素材库中的角色作为参考图，保持视觉一致性
                      </FormDescription>
                      <FormMessage />

                      {/* 参考图预览 */}
                      {field.value && field.value !== "none" && (
                        <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                          {(() => {
                            const selectedAsset = state.characterAssets.find(
                              (a) => a.id === field.value
                            );
                            if (!selectedAsset) return null;
                            return (
                              <div className="flex items-center gap-3">
                                {selectedAsset.base_image_url && (
                                  <img
                                    src={selectedAsset.base_image_url}
                                    alt={selectedAsset.name}
                                    className="w-16 h-16 rounded object-cover"
                                  />
                                )}
                                <div>
                                  <div className="font-medium">{selectedAsset.name}</div>
                                  {selectedAsset.comic_style && (
                                    <div className="text-sm text-muted-foreground">
                                      风格：{selectedAsset.comic_style.name_zh}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={state.isGenerating}
              >
                取消
              </Button>
              <Button type="submit" disabled={state.isGenerating || !isValidSelection}>
                {state.isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Grid3x3 className="mr-2 h-4 w-4" />
                    生成九宫格图片
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
