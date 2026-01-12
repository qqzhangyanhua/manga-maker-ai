/**
 * 图谱工具栏组件
 */
"use client";

import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  Circle,
  Network,
  Download,
  Save,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { LayoutType } from './types';

interface GraphToolbarProps {
  layoutType: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  onExportImage?: () => void;
  onSave?: () => void;
  onReset?: () => void;
  isSaving?: boolean;
  readonly?: boolean;
}

export function GraphToolbar({
  layoutType,
  onLayoutChange,
  onExportImage,
  onSave,
  onReset,
  isSaving = false,
  readonly = false,
}: GraphToolbarProps) {
  return (
    <div className="bg-background/95 backdrop-blur border rounded-lg shadow-lg p-2 flex gap-2 items-center">
      {/* 布局控制 */}
      <div className="flex gap-1">
        <Button
          variant={layoutType === 'dagre' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onLayoutChange('dagre')}
          title="层次布局"
        >
          <Network className="w-4 h-4" />
        </Button>
        <Button
          variant={layoutType === 'circle' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onLayoutChange('circle')}
          title="圆形布局"
        >
          <Circle className="w-4 h-4" />
        </Button>
        <Button
          variant={layoutType === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onLayoutChange('grid')}
          title="网格布局"
        >
          <LayoutGrid className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* 操作按钮 */}
      <div className="flex gap-1">
        {!readonly && onSave && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            title="保存布局"
          >
            <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
          </Button>
        )}

        {onExportImage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onExportImage}
            title="导出图片"
          >
            <Download className="w-4 h-4" />
          </Button>
        )}

        {!readonly && onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            title="重置布局"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
