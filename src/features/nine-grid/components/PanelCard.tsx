/**
 * 分镜卡片组件
 * 显示单个分镜的信息和选中状态
 */

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { Panel } from '../types';

interface PanelCardProps {
  panel: Panel;
  isSelected: boolean;
  selectionIndex: number;
  onSelect: (panelId: string) => void;
  disabled?: boolean;
}

export function PanelCard({
  panel,
  isSelected,
  selectionIndex,
  onSelect,
  disabled = false,
}: PanelCardProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border-2 transition-all',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        isSelected
          ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20'
          : 'border-transparent bg-muted/30 hover:bg-muted/50'
      )}
      onClick={() => !disabled && onSelect(panel.id)}
    >
      <Checkbox
        checked={isSelected}
        disabled={disabled}
        className="mt-1 pointer-events-none"
      />

      {panel.generated_image && (
        <img
          src={panel.generated_image}
          alt={`分镜 ${panel.panel_order}`}
          className="w-20 h-20 rounded object-cover"
          loading="lazy"
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">分镜 {panel.panel_order}</span>
          {isSelected && (
            <Badge className="bg-orange-500 hover:bg-orange-600">
              位置 {selectionIndex + 1}
            </Badge>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {panel.description}
        </p>
        
        {/* 元数据标签 */}
        <div className="flex gap-2 flex-wrap">
          {panel.shot_size && (
            <Badge variant="secondary" className="text-xs">
              {panel.shot_size}
            </Badge>
          )}
          {panel.camera_angle && (
            <Badge variant="outline" className="text-xs">
              {panel.camera_angle}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
