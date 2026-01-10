/**
 * 分镜网格组件
 * 显示所有分镜并支持选择
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckSquare } from 'lucide-react';
import { useNineGridStore } from '../stores/useNineGridStore';
import { PanelCard } from './PanelCard';

export function PanelGrid() {
  const {
    chapterPanels,
    selectedPanelIds,
    isLoadingPanels,
    selectPanel,
    selectFirst9,
    clearSelection,
  } = useNineGridStore();
  
  // 计算按钮状态
  const canSelectFirst9 = useMemo(
    () => chapterPanels.length >= 9,
    [chapterPanels.length]
  );
  
  const canClearSelection = useMemo(
    () => selectedPanelIds.length > 0,
    [selectedPanelIds.length]
  );
  
  if (isLoadingPanels) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          加载分镜中...
        </span>
      </div>
    );
  }
  
  if (chapterPanels.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        该章节暂无分镜，请先生成分镜
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4" />
          <span className="text-sm font-medium">
            选择 9 个分镜
          </span>
          <span className="text-sm text-muted-foreground">
            (已选 {selectedPanelIds.length}/9)
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectFirst9}
            disabled={!canSelectFirst9}
          >
            选择前9个
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSelection}
            disabled={!canClearSelection}
          >
            清空选择
          </Button>
        </div>
      </div>
      
      {/* 分镜网格 */}
      <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto border rounded-lg p-4">
        {chapterPanels.map((panel) => {
          const isSelected = selectedPanelIds.includes(panel.id);
          const selectionIndex = selectedPanelIds.indexOf(panel.id);
          const disabled = !isSelected && selectedPanelIds.length >= 9;
          
          return (
            <PanelCard
              key={panel.id}
              panel={panel}
              isSelected={isSelected}
              selectionIndex={selectionIndex}
              onSelect={selectPanel}
              disabled={disabled}
            />
          );
        })}
      </div>
      
      {/* 提示信息 */}
      <p className="text-sm text-muted-foreground">
        点击分镜卡片进行选择，选中的分镜将按顺序排列在九宫格中
      </p>
      
      {selectedPanelIds.length !== 9 && chapterPanels.length > 0 && (
        <p className="text-sm text-destructive">
          请选择恰好 9 个分镜
        </p>
      )}
    </div>
  );
}
