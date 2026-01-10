/**
 * 九宫格生成 Hook
 * 封装生成逻辑
 */

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNineGridStore } from '../stores/useNineGridStore';
import * as nineGridApi from '../services/nineGridApi';
import type { GenerateNineGridParams } from '../types';

export function useNineGridGeneration() {
  const { toast } = useToast();
  const store = useNineGridStore();
  
  /**
   * 生成九宫格
   */
  const generateNineGrid = useCallback(async (
    params: Omit<GenerateNineGridParams, 'panelIds'>
  ) => {
    const { selectedPanelIds } = store;
    
    // 验证选择
    if (selectedPanelIds.length !== 9) {
      toast({
        title: '错误',
        description: '请选择恰好 9 个分镜',
        variant: 'destructive',
      });
      return null;
    }
    
    store.setGenerating(true);
    
    try {
      const result = await nineGridApi.generateNineGrid({
        ...params,
        panelIds: selectedPanelIds,
      });
      
      // 添加到历史记录
      store.addToHistory({
        id: result.id,
        timestamp: Date.now(),
        params: {
          ...params,
          panelIds: selectedPanelIds,
        },
        result,
      });
      
      toast({
        title: '生成成功',
        description: '九宫格图片已生成并保存到素材库',
      });
      
      return result;
    } catch (error) {
      const message = nineGridApi.handleApiError(error);
      toast({
        title: '生成失败',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      store.setGenerating(false);
    }
  }, [store, toast]);
  
  return {
    generateNineGrid,
  };
}
