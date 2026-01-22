import { PlayCircle, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanvasStore } from '@/stores/canvas-store';
import type { CanvasTimeline, PaginatedTimeline } from './types';

interface GlobalActionsProps {
  timeline: CanvasTimeline | PaginatedTimeline;
}

export function GlobalActions({ timeline }: GlobalActionsProps) {
  const batchMode = useCanvasStore(state => state.batchMode);
  const selectedNodeIds = useCanvasStore(state => state.selectedNodeIds);
  const setSelectedNodeIds = useCanvasStore(state => state.setSelectedNodeIds);
  const clearSelection = useCanvasStore(state => state.clearSelection);

  if (!batchMode) {
    return null;
  }

  const allChapterIds = (timeline.chapters || []).map(ch => ch.id);
  const allSelected = allChapterIds.length > 0 && allChapterIds.every(id => selectedNodeIds.has(id));

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      setSelectedNodeIds(new Set(allChapterIds));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={handleSelectAll}
        className="text-zinc-300 hover:text-white hover:bg-zinc-800"
      >
        {allSelected ? (
          <>
            <CheckSquare className="w-4 h-4 mr-1" />
            <span className="text-xs">取消全选</span>
          </>
        ) : (
          <>
            <Square className="w-4 h-4 mr-1" />
            <span className="text-xs">全部选择</span>
          </>
        )}
      </Button>
    </div>
  );
}
