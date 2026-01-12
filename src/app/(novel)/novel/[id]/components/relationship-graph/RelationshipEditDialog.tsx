/**
 * 关系编辑对话框组件
 */
"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Save } from 'lucide-react';
import type { RelationshipEdgeData, RelationType } from './types';
import { RELATION_TYPE_CONFIGS } from './types';

interface RelationshipEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationshipData: RelationshipEdgeData | null;
  sourceCharacterName?: string;
  targetCharacterName?: string;
  onSave: (updatedData: Partial<RelationshipEdgeData>) => void;
  onDelete?: () => void;
}

export function RelationshipEditDialog({
  open,
  onOpenChange,
  relationshipData,
  sourceCharacterName,
  targetCharacterName,
  onSave,
  onDelete,
}: RelationshipEditDialogProps) {
  const [relationType, setRelationType] = useState<RelationType>(
    relationshipData?.type || 'neutral'
  );
  const [description, setDescription] = useState(
    relationshipData?.description || ''
  );
  const [isBidirectional, setIsBidirectional] = useState(
    relationshipData?.isBidirectional ?? true
  );

  // 当 relationshipData 变化时更新表单
  useEffect(() => {
    if (relationshipData) {
      setRelationType(relationshipData.type);
      setDescription(relationshipData.description || '');
      setIsBidirectional(relationshipData.isBidirectional ?? true);
    }
  }, [relationshipData]);

  const handleSave = () => {
    onSave({
      type: relationType,
      description: description.trim() || undefined,
      isBidirectional,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      onOpenChange(false);
    }
  };

  if (!relationshipData) return null;

  const config = RELATION_TYPE_CONFIGS[relationType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>编辑角色关系</DialogTitle>
          <DialogDescription>
            修改 <span className="font-semibold">{sourceCharacterName || '角色A'}</span> 和{' '}
            <span className="font-semibold">{targetCharacterName || '角色B'}</span> 之间的关系
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 关系类型选择 */}
          <div className="space-y-2">
            <Label htmlFor="relation-type">关系类型</Label>
            <Select
              value={relationType}
              onValueChange={(value) => setRelationType(value as RelationType)}
            >
              <SelectTrigger id="relation-type">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span>{config.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(RELATION_TYPE_CONFIGS).map((cfg) => (
                  <SelectItem key={cfg.type} value={cfg.type}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cfg.color }}
                      />
                      <span>{cfg.label}</span>
                      {cfg.animated && (
                        <span className="text-xs text-muted-foreground">(动画)</span>
                      )}
                      {cfg.markerEnd && (
                        <span className="text-xs text-muted-foreground">(箭头)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 关系描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">关系描述 (可选)</Label>
            <Textarea
              id="description"
              placeholder="例如: 传授武功的师父、杀父仇人、青梅竹马..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/200
            </p>
          </div>

          {/* 双向关系开关 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="bidirectional"
              checked={isBidirectional}
              onChange={(e) => setIsBidirectional(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label htmlFor="bidirectional" className="font-normal cursor-pointer">
              双向关系 (两个角色互相认识)
            </Label>
          </div>

          {/* 预览 */}
          <div className="mt-4 p-3 rounded-lg border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">预览:</p>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{sourceCharacterName || '角色A'}</span>
              <div className="flex-1 flex items-center gap-1">
                <div
                  className="flex-1 h-0.5"
                  style={{ backgroundColor: config.color }}
                />
                {config.markerEnd && (
                  <span style={{ color: config.color }}>→</span>
                )}
              </div>
              <span className="font-semibold">{targetCharacterName || '角色B'}</span>
            </div>
            <p className="text-xs text-center mt-1" style={{ color: config.color }}>
              {config.label}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                "{description}"
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除关系
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
