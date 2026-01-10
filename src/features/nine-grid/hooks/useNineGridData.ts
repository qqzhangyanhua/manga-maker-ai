/**
 * 九宫格数据加载 Hook
 * 封装所有数据加载逻辑
 */

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNineGridStore } from '../stores/useNineGridStore';
import * as nineGridApi from '../services/nineGridApi';

export function useNineGridData() {
  const { toast } = useToast();
  const store = useNineGridStore();
  
  /**
   * 加载章节分镜
   */
  const loadChapterPanels = useCallback(async (chapterId: string) => {
    store.setLoadingPanels(true);
    
    try {
      const panels = await nineGridApi.getChapterPanels(chapterId);
      store.setChapterPanels(panels);
      
      // 自动选择前9个分镜（如果有足够的分镜）
      if (panels.length >= 9) {
        store.selectFirst9();
      } else if (panels.length > 0 && panels.length < 9) {
        // 提示用户分镜不足
        toast({
          title: '提示',
          description: `当前章节有 ${panels.length} 个分镜，少于 9 个，无法生成九宫格`,
          variant: 'default',
        });
      }
    } catch (error) {
      const message = nineGridApi.handleApiError(error);
      toast({
        title: '加载失败',
        description: message,
        variant: 'destructive',
      });
    } finally {
      store.setLoadingPanels(false);
    }
  }, [store, toast]);
  
  /**
   * 加载漫画风格
   */
  const loadComicStyles = useCallback(async () => {
    store.setLoadingStyles(true);
    
    try {
      const styles = await nineGridApi.getComicStyles();
      store.setComicStyles(styles);
    } catch (error) {
      const message = nineGridApi.handleApiError(error);
      console.error('加载漫画风格失败:', message);
    } finally {
      store.setLoadingStyles(false);
    }
  }, [store]);
  
  /**
   * 加载角色素材
   */
  const loadCharacterAssets = useCallback(async () => {
    store.setLoadingAssets(true);
    
    try {
      const assets = await nineGridApi.getCharacterAssets();
      store.setCharacterAssets(assets);
    } catch (error) {
      const message = nineGridApi.handleApiError(error);
      console.error('加载角色素材失败:', message);
    } finally {
      store.setLoadingAssets(false);
    }
  }, [store]);
  
  /**
   * 加载所有初始数据
   */
  const loadInitialData = useCallback(async () => {
    await Promise.all([
      loadComicStyles(),
      loadCharacterAssets(),
    ]);
  }, [loadComicStyles, loadCharacterAssets]);
  
  return {
    loadChapterPanels,
    loadComicStyles,
    loadCharacterAssets,
    loadInitialData,
  };
}
