/**
 * Zustand store for NineGrid dialog state management
 */

import { create } from "zustand";
import type {
    Panel,
    ComicStyle,
    CharacterAsset,
} from "../types";

interface NineGridState {
    // Data
    chapterPanels: Panel[];
    comicStyles: ComicStyle[];
    characterAssets: CharacterAsset[];

    // Loading states
    isLoadingPanels: boolean;
    isLoadingStyles: boolean;
    isLoadingAssets: boolean;

    // Selection
    selectedChapterId: string;
    selectedPanelIds: string[];

    // Generation
    isGenerating: boolean;
    generatedImageUrl: string | null;
    generatedPanels: Array<{
        panel_order: number;
        description: string;
        visual_prompt: string;
    }> | null;
}

interface NineGridActions {
    // Chapter actions
    setChapter: (chapterId: string) => void;

    // Panel actions
    loadPanels: (chapterId: string, toast: any) => Promise<void>;
    togglePanel: (panelId: string) => void;
    selectFirst9: (toast: any) => void;
    clearSelection: () => void;

    // Style and asset actions
    loadStyles: () => Promise<void>;
    loadAssets: () => Promise<void>;

    // Generation actions
    setGenerating: (generating: boolean) => void;
    setResult: (imageUrl: string, panels?: Array<{ panel_order: number; description: string; visual_prompt: string }>) => void;
    clearResult: () => void;

    // Reset
    reset: () => void;
}

type NineGridStore = NineGridState & NineGridActions;

const initialState: NineGridState = {
    chapterPanels: [],
    comicStyles: [],
    characterAssets: [],
    isLoadingPanels: false,
    isLoadingStyles: false,
    isLoadingAssets: false,
    selectedChapterId: "",
    selectedPanelIds: [],
    isGenerating: false,
    generatedImageUrl: null,
    generatedPanels: null,
};

export const useNineGridStore = create<NineGridStore>((set, get) => ({
    ...initialState,

    // Chapter actions
    setChapter: (chapterId) => {
        set({
            selectedChapterId: chapterId,
            selectedPanelIds: [],
            chapterPanels: [],
        });
    },

    // Panel actions
    loadPanels: async (chapterId, toast) => {
        set({ isLoadingPanels: true });
        try {
            const response = await fetch(`/api/chapter/${chapterId}/panels`);
            if (response.ok) {
                const data = await response.json();
                const panels = data.panels || [];

                set({ chapterPanels: panels });

                // Auto-select first 9 panels
                if (panels.length >= 9) {
                    const first9 = panels.slice(0, 9).map((p: Panel) => p.id);
                    set({ selectedPanelIds: first9 });
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
            set({ isLoadingPanels: false });
        }
    },

    togglePanel: (panelId) => {
        const { selectedPanelIds } = get();

        if (selectedPanelIds.includes(panelId)) {
            set({
                selectedPanelIds: selectedPanelIds.filter((id) => id !== panelId),
            });
        } else if (selectedPanelIds.length < 9) {
            set({
                selectedPanelIds: [...selectedPanelIds, panelId],
            });
        }
    },

    selectFirst9: (toast) => {
        const { chapterPanels } = get();

        if (chapterPanels.length === 0) {
            toast({
                title: "提示",
                description: "当前章节没有分镜，请先生成分镜",
                variant: "default",
            });
            return;
        }

        if (chapterPanels.length < 9) {
            toast({
                title: "提示",
                description: `当前章节只有 ${chapterPanels.length} 个分镜，少于 9 个`,
                variant: "default",
            });
            return;
        }

        const first9 = chapterPanels.slice(0, 9).map((p) => p.id);
        set({ selectedPanelIds: first9 });
    },

    clearSelection: () => {
        set({ selectedPanelIds: [] });
    },

    // Style and asset actions
    loadStyles: async () => {
        set({ isLoadingStyles: true });
        try {
            const response = await fetch("/api/comic-styles?enabled=true");
            if (response.ok) {
                const data = await response.json();
                set({ comicStyles: data.data || [] });
            }
        } catch (error) {
            console.error("加载漫画风格失败:", error);
        } finally {
            set({ isLoadingStyles: false });
        }
    },

    loadAssets: async () => {
        set({ isLoadingAssets: true });
        try {
            const response = await fetch("/api/character");
            if (response.ok) {
                const data = await response.json();
                const assetsWithImage = (data.characters || []).filter(
                    (char: CharacterAsset) => char.base_image_url
                );
                set({ characterAssets: assetsWithImage });
            }
        } catch (error) {
            console.error("加载角色素材失败:", error);
        } finally {
            set({ isLoadingAssets: false });
        }
    },

    // Generation actions
    setGenerating: (generating) => {
        set({ isGenerating: generating });
    },

    setResult: (imageUrl, panels) => {
        set({
            generatedImageUrl: imageUrl,
            generatedPanels: panels || null,
            isGenerating: false,
        });
    },

    clearResult: () => {
        set({
            generatedImageUrl: null,
            generatedPanels: null,
        });
    },

    // Reset
    reset: () => {
        set(initialState);
    },
}));
