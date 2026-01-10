/**
 * 九宫格功能 Zustand Store
 * 统一管理九宫格对话框的所有状态
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Panel, ComicStyle, CharacterAsset, NineGridHistory } from '../types';

interface NineGridState {
  // ==================== 数据状态 ====================
  chapterPanels: Panel[];
  comicStyles: ComicStyle[];
  characterAssets: CharacterAsset[];
  
  // ==================== 选择状态 ====================
  selectedChapterId: string;
  selectedPanelIds: string[];
  
  // ==================== 加载状态 ====================
  isLoadingPanels: boolean;
  isLoadingStyles: boolean;
  isLoadingAssets: boolean;
  isGenerating: boolean;
  
  // ==================== 历史记录 ====================
  history: NineGridHistory[];
  
  // ==================== Actions ====================
  
  /**
   * 设置章节分镜数据
   */
  setChapterPanels: (panels: Panel[]) => void;
  
  /**
   * 设置漫画风格数据
   */
  setComicStyles: (styles: ComicStyle[]) => void;
  
  /**
   * 设置角色素材数据
   */
  setCharacterAssets: (assets: CharacterAsset[]) => void;
  
  /**
   * 设置选中的章节ID
   */
  setSelectedChapterId: (chapterId: string) => void;
  
  /**
   * 设置加载状态
   */
  setLoadingPanels: (loading: boolean) => void;
  setLoadingStyles: (loading: boolean) => void;
  setLoadingAssets: (loading: boolean) => void;
  setGenerating: (generating: boolean) => void;
  
  /**
   * 选择/取消选择分镜
   */
  selectPanel: (panelId: string) => void;
  
  /**
   * 选择前9个分镜
   */
  selectFirst9: () => void;
  
  /**
   * 清空选择
   */
  clearSelection: () => void;
  
  /**
   * 重置所有状态
   */
  reset: () => void;
  
  /**
   * 添加到历史记录
   */
  addToHistory: (item: NineGridHistory) => void;
  
  /**
   * 从历史记录加载
   */
  loadFromHistory: (id: string) => void;
}

const initialState = {
  chapterPanels: [],
  comicStyles: [],
  characterAssets: [],
  selectedChapterId: '',
  selectedPanelIds: [],
  isLoadingPanels: false,
  isLoadingStyles: false,
  isLoadingAssets: false,
  isGenerating: false,
  history: [],
};

export const useNineGridStore = create<NineGridState>()(
  devtools(
    immer((set, get) => ({
      ...initialState,
      
      // ==================== Setters ====================
      
      setChapterPanels: (panels) => {
        set((state) => {
          state.chapterPanels = panels;
        });
      },
      
      setComicStyles: (styles) => {
        set((state) => {
          state.comicStyles = styles;
        });
      },
      
      setCharacterAssets: (assets) => {
        set((state) => {
          state.characterAssets = assets;
        });
      },
      
      setSelectedChapterId: (chapterId) => {
        set((state) => {
          state.selectedChapterId = chapterId;
          // 切换章节时清空分镜选择
          state.selectedPanelIds = [];
          state.chapterPanels = [];
        });
      },
      
      setLoadingPanels: (loading) => {
        set((state) => {
          state.isLoadingPanels = loading;
        });
      },
      
      setLoadingStyles: (loading) => {
        set((state) => {
          state.isLoadingStyles = loading;
        });
      },
      
      setLoadingAssets: (loading) => {
        set((state) => {
          state.isLoadingAssets = loading;
        });
      },
      
      setGenerating: (generating) => {
        set((state) => {
          state.isGenerating = generating;
        });
      },
      
      // ==================== 分镜选择 ====================
      
      selectPanel: (panelId) => {
        set((state) => {
          const index = state.selectedPanelIds.indexOf(panelId);
          
          if (index > -1) {
            // 取消选择
            state.selectedPanelIds.splice(index, 1);
          } else if (state.selectedPanelIds.length < 9) {
            // 添加选择（最多9个）
            state.selectedPanelIds.push(panelId);
          }
        });
      },
      
      selectFirst9: () => {
        set((state) => {
          const { chapterPanels } = state;
          if (chapterPanels.length >= 9) {
            state.selectedPanelIds = chapterPanels
              .slice(0, 9)
              .map((p) => p.id);
          }
        });
      },
      
      clearSelection: () => {
        set((state) => {
          state.selectedPanelIds = [];
        });
      },
      
      // ==================== 重置 ====================
      
      reset: () => {
        set((state) => {
          state.selectedChapterId = '';
          state.selectedPanelIds = [];
          state.chapterPanels = [];
        });
      },
      
      // ==================== 历史记录 ====================
      
      addToHistory: (item) => {
        set((state) => {
          state.history.unshift(item);
          // 只保留最近 50 条
          if (state.history.length > 50) {
            state.history = state.history.slice(0, 50);
          }
        });
      },
      
      loadFromHistory: (id) => {
        const item = get().history.find((h) => h.id === id);
        if (item) {
          set((state) => {
            state.selectedChapterId = item.params.chapterId;
            state.selectedPanelIds = item.params.panelIds;
          });
        }
      },
    })),
    { name: 'NineGridStore' }
  )
);
