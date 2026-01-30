"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { parseErrorFromResponse } from "@/lib/error-utils";
import type { CanvasTimelineConfig } from "./types";

interface TimelineSettingsProps {
  open: boolean;
  onClose: () => void;
  timelineId: string;
  currentConfig: CanvasTimelineConfig;
  onSaved?: () => void;
}

export function TimelineSettings({
  open,
  onClose,
  timelineId,
  currentConfig,
  onSaved,
}: TimelineSettingsProps) {
  const [config, setConfig] = useState<CanvasTimelineConfig>(currentConfig);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/canvas/timeline/${timelineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        const errorMsg = await parseErrorFromResponse(response, "保存失败");
        throw new Error(errorMsg);
      }

      toast.success("时间线设置已更新");

      onSaved?.();
      onClose();
    } catch (error) {
      console.error("保存设置失败:", error);
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f0f13] text-white max-w-md border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            时间线设置
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            配置 AI 生成参数和资产库选项
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* AI 模型选择 */}
          <div className="space-y-2">
            <Label className="text-zinc-200">AI 模型</Label>
            <Select
              value={config.ai_model || "gpt-4"}
              onValueChange={(value) =>
                setConfig({
                  ...config,
                  ai_model: value as "gpt-4" | "gpt-3.5-turbo",
                })
              }
            >
              <SelectTrigger className="bg-zinc-900/50 border-zinc-800 focus:ring-purple-500/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="gpt-4" className="focus:bg-zinc-800 focus:text-purple-400">GPT-4 (高质量)</SelectItem>
                <SelectItem value="gpt-3.5-turbo" className="focus:bg-zinc-800 focus:text-purple-400">GPT-3.5 (快速)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">
              GPT-4 生成质量更高但速度较慢
            </p>
          </div>

          {/* 镜头密度 */}
          <div className="space-y-2">
            <Label className="text-zinc-200">镜头密度</Label>
            <Select
              value={config.shot_density || "medium"}
              onValueChange={(value) =>
                setConfig({
                  ...config,
                  shot_density: value as "sparse" | "medium" | "dense",
                })
              }
            >
              <SelectTrigger className="bg-zinc-900/50 border-zinc-800 focus:ring-purple-500/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="sparse" className="focus:bg-zinc-800 focus:text-purple-400">稀疏 (2-3 镜头/片段)</SelectItem>
                <SelectItem value="medium" className="focus:bg-zinc-800 focus:text-purple-400">中等 (4-5 镜头/片段)</SelectItem>
                <SelectItem value="dense" className="focus:bg-zinc-800 focus:text-purple-400">密集 (6-8 镜头/片段)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">
              控制每个剧本片段生成的镜头数量
            </p>
          </div>

          {/* 视觉风格 */}
          <div className="space-y-2">
            <Label className="text-zinc-200">视觉风格</Label>
            <Select
              value={config.visual_style || "manga"}
              onValueChange={(value) =>
                setConfig({
                  ...config,
                  visual_style: value as "manga" | "realistic" | "anime",
                })
              }
            >
              <SelectTrigger className="bg-zinc-900/50 border-zinc-800 focus:ring-purple-500/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="manga" className="focus:bg-zinc-800 focus:text-purple-400">漫画风格</SelectItem>
                <SelectItem value="anime" className="focus:bg-zinc-800 focus:text-purple-400">动漫风格</SelectItem>
                <SelectItem value="realistic" className="focus:bg-zinc-800 focus:text-purple-400">写实风格</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 语言 */}
          <div className="space-y-2">
            <Label className="text-zinc-200">语言</Label>
            <Select
              value={config.language || "zh-CN"}
              onValueChange={(value) =>
                setConfig({
                  ...config,
                  language: value as "zh-CN" | "en-US",
                })
              }
            >
              <SelectTrigger className="bg-zinc-900/50 border-zinc-800 focus:ring-purple-500/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="zh-CN" className="focus:bg-zinc-800 focus:text-purple-400">简体中文</SelectItem>
                <SelectItem value="en-US" className="focus:bg-zinc-800 focus:text-purple-400">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-zinc-800 pt-4">
            <h4 className="text-sm font-medium text-zinc-300 mb-3">
              资产库集成
            </h4>

            {/* 自动生成开关 */}
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-zinc-200">自动生成</Label>
                <p className="text-xs text-zinc-500">
                  点击"全部生成"时自动执行所有步骤
                </p>
              </div>
              <Switch
                checked={config.auto_generate}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, auto_generate: checked })
                }
              />
            </div>

            {/* 使用角色库 */}
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-zinc-200">使用角色库</Label>
                <p className="text-xs text-zinc-500">
                  从角色库中匹配角色形象
                </p>
              </div>
              <Switch
                checked={config.use_character_library}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, use_character_library: checked })
                }
              />
            </div>

            {/* 使用场景库 */}
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-zinc-200">使用场景库</Label>
                <p className="text-xs text-zinc-500">
                  从场景库中匹配背景素材
                </p>
              </div>
              <Switch
                checked={config.use_scene_library}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, use_scene_library: checked })
                }
              />
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 justify-end pt-4 border-t border-zinc-800">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saving ? "保存中..." : "保存设置"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
