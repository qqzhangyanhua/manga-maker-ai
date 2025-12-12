/**
 * 故事信息面板组件
 * 显示故事的基本信息、编辑模式和角色列表
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Loader2 } from "lucide-react";
import { SaveIndicator } from "@/components/ui/save-indicator";
import { useAutoSave } from "@/hooks/useAutoSave";
import type { Story } from "../types/script-editor.types";

interface StoryInfoPanelProps {
  story: Story;
  editMode: boolean;
  storyForm: {
    title: string;
    premise: string;
  };
  saving: boolean;
  onEditModeToggle: () => void;
  onCancel: () => void;
  onSave: () => void;
  onFormChange: (field: "title" | "premise", value: string) => void;
  onAutoSave?: (data: { title: string; premise: string }) => Promise<void>; // New prop for auto-save
}

export function StoryInfoPanel({
  story,
  editMode,
  storyForm,
  saving,
  onEditModeToggle,
  onCancel,
  onSave,
  onFormChange,
  onAutoSave,
}: StoryInfoPanelProps) {
  // Auto-save hook (only active in edit mode)
  const autoSave = useAutoSave({
    data: storyForm,
    onSave: async (data) => {
      if (onAutoSave) {
        await onAutoSave(data);
      }
    },
    delay: 3000,
    enabled: editMode && !!onAutoSave,
  });

  // Determine save status for indicator
  const saveStatus = autoSave.isSaving
    ? 'saving'
    : autoSave.isSuccess
      ? 'saved'
      : autoSave.isError
        ? 'error'
        : 'idle';
  return (
    <div className="space-y-6">
      {/* 故事基本信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>剧本信息</CardTitle>
              {story._syncing && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  同步中
                </span>
              )}
            </div>
            {editMode && <SaveIndicator status={saveStatus} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>标题</Label>
            {editMode ? (
              <Input
                value={storyForm.title}
                onChange={(e) => onFormChange("title", e.target.value)}
              />
            ) : (
              <p className="font-medium">{story.title}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>创意前提 / 梗概</Label>
            {editMode ? (
              <Textarea
                value={storyForm.premise}
                onChange={(e) => onFormChange("premise", e.target.value)}
                rows={6}
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {story.premise}
              </p>
            )}
          </div>

          {/* 编辑模式按钮 */}
          <div className="flex gap-2 pt-2">
            {editMode ? (
              <>
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={saving}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  onClick={onSave}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  保存修改
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={onEditModeToggle}
                className="w-full"
              >
                <Edit className="w-4 h-4 mr-2" />
                编辑剧本信息
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
