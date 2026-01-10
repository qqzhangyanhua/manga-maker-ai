/**
 * 九宫格对话框状态管理 Hook
 * 集中管理 Reducer、数据加载逻辑和副作用
 */

import { useReducer, useCallback, useRef, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import type {
  DialogState,
  DialogAction,
  Panel,
  ComicStyle,
  CharacterAsset,
  FormData,
} from "./types";

// ==================== Reducer ====================

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
  generatedImageUrl: null,
  generatedPanels: null,
};

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "SET_CHAPTER":
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
        return {
          ...state,
          selectedPanelIds: selectedPanelIds.filter((id) => id !== panelId),
        };
      } else if (selectedPanelIds.length < 9) {
        return {
          ...state,
          selectedPanelIds: [...selectedPanelIds, panelId],
        };
      }
      return state;
    }
      
    case "SELECT_FIRST_9": {
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
      
    case "SET_RESULT":
      return {
        ...state,
        generatedImageUrl: action.imageUrl,
        generatedPanels: action.panels || null,
        isGenerating: false,
      };
      
    case "CLEAR_RESULT":
      return {
        ...state,
        generatedImageUrl: null,
        generatedPanels: null,
      };
      
    case "RESET":
      return initialState;
      
    default:
      return state;
  }
}

// ==================== Hook ====================

interface UseNineGridDialogOptions {
  open: boolean;
  form: UseFormReturn<FormData>;
}

export function useNineGridDialog({ open, form }: UseNineGridDialogOptions) {
  const { toast } = useToast();
  const [state, dispatch] = useReducer(dialogReducer, initialState);
  
  // 使用 ref 存储最新值，避免依赖变化导致重新创建回调
  const formRef = useRef(form);
  const chapterPanelsRef = useRef<Panel[]>([]);
  
  useEffect(() => {
    formRef.current = form;
  }, [form]);
  
  useEffect(() => {
    chapterPanelsRef.current = state.chapterPanels;
  }, [state.chapterPanels]);

  // ==================== 数据加载 ====================

  /**
   * 加载章节分镜
   */
  const loadChapterPanels = useCallback(async (chapterId: string) => {
    dispatch({ type: "SET_LOADING_PANELS", loading: true });
    try {
      const response = await fetch(`/api/chapter/${chapterId}/panels`);
      if (response.ok) {
        const data = await response.json();
        const panels = data.panels || [];
        
        dispatch({ type: "SET_PANELS", panels });
        
        // 自动选择前9个分镜
        if (panels.length >= 9) {
          dispatch({ type: "SELECT_FIRST_9" });
        } else if (panels.length > 0 && panels.length < 9) {
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

  /**
   * 加载漫画风格
   */
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

  /**
   * 加载角色素材
   */
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

  /**
   * 对话框打开时加载数据，关闭时重置
   */
  useEffect(() => {
    if (open) {
      loadComicStyles();
      loadCharacterAssets();
    } else {
      dispatch({ type: "RESET" });
      formRef.current.reset();
    }
  }, [open, loadComicStyles, loadCharacterAssets]);

  /**
   * 监听章节变化，加载对应分镜
   */
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      const newChapterId = value.chapterId;
      
      if (name === "chapterId" && newChapterId && newChapterId !== state.selectedChapterId) {
        dispatch({ type: "SET_CHAPTER", chapterId: newChapterId });
        loadChapterPanels(newChapterId);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, state.selectedChapterId, loadChapterPanels]);

  // ==================== 事件处理 ====================

  /**
   * 切换分镜选择状态
   */
  const handlePanelToggle = useCallback((panelId: string) => {
    dispatch({ type: "TOGGLE_PANEL", panelId });
  }, []);

  /**
   * 选择前9个分镜
   */
  const handleSelectFirst9 = useCallback(() => {
    const panels = chapterPanelsRef.current;
    
    if (panels.length === 0) {
      toast({
        title: "提示",
        description: "当前章节没有分镜，请先生成分镜",
        variant: "default",
      });
      return;
    }
    
    if (panels.length < 9) {
      toast({
        title: "提示",
        description: `当前章节只有 ${panels.length} 个分镜，少于 9 个`,
        variant: "default",
      });
      return;
    }
    
    dispatch({ type: "SELECT_FIRST_9" });
  }, [toast]);

  /**
   * 清空选择
   */
  const handleClearSelection = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" });
  }, []);

  /**
   * 重置状态
   */
  const handleReset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  /**
   * 设置生成状态
   */
  const setGenerating = useCallback((generating: boolean) => {
    dispatch({ type: "SET_GENERATING", generating });
  }, []);

  /**
   * 设置生成结果
   */
  const setResult = useCallback((imageUrl: string, panels?: Array<{ panel_order: number; description: string; visual_prompt: string }>) => {
    dispatch({ type: "SET_RESULT", imageUrl, panels });
  }, []);

  /**
   * 清除生成结果
   */
  const clearResult = useCallback(() => {
    dispatch({ type: "CLEAR_RESULT" });
  }, []);

  return {
    state,
    handlers: {
      handlePanelToggle,
      handleSelectFirst9,
      handleClearSelection,
      handleReset,
      setGenerating,
      setResult,
      clearResult,
    },
  };
}
