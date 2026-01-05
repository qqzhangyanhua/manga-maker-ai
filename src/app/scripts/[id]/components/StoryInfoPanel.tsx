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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { SaveIndicator } from "@/components/ui/save-indicator";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useComicStyles } from "../hooks/useComicStyles";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Story } from "../types/script-editor.types";

interface StoryInfoPanelProps {
  story: Story;
  editMode: boolean;
  storyForm: {
    title: string;
    premise: string;
    comic_style_id?: string | null;
    style_reference_image?: string | null;
  };
  saving: boolean;
  onEditModeToggle: () => void;
  onCancel: () => void;
  onSave: () => void;
  onFormChange: (field: "title" | "premise" | "comic_style_id" | "style_reference_image", value: string | null) => void;
  onAutoSave?: (data: { title: string; premise: string; comic_style_id?: string | null; style_reference_image?: string | null }) => Promise<void>; // New prop for auto-save
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
  const { toast } = useToast();

  // Comic styles hook
  const { data: comicStyles = [], isLoading: stylesLoading } = useComicStyles();

  // Local state for image upload
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "文件类型错误",
        description: "请上传图片文件",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "图片大小不能超过10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          const base64Data = base64String.split(",")[1];

          // Upload via API
          const response = await fetch("/api/story/upload-style-ref", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64Data,
              filename: `style-ref-${Date.now()}.png`,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "上传失败");
          }

          const data = await response.json();

          // Update form
          onFormChange("style_reference_image", data.url);
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          toast({
            title: "上传失败",
            description: uploadError instanceof Error ? uploadError.message : "图片上传失败",
            variant: "destructive",
          });
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        toast({
          title: "读取失败",
          description: "读取文件失败",
          variant: "destructive",
        });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File read error:", error);
      toast({
        title: "读取失败",
        description: "读取文件失败",
        variant: "destructive",
      });
      setUploading(false);
    }
  };

  // Remove reference image
  const handleRemoveImage = () => {
    onFormChange("style_reference_image", null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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

          {/* 漫画风格选择 */}
          <div className="space-y-2">
            <Label>漫画风格</Label>
            {editMode ? (
              <Select
                value={storyForm.comic_style_id || "none"}
                onValueChange={(value) => onFormChange("comic_style_id", value === "none" ? null : value)}
                disabled={stylesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择漫画风格（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无</SelectItem>
                  {comicStyles.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                      {style.name_zh} ({style.name_en})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                {story.comic_style ? `${story.comic_style.name_zh} (${story.comic_style.name_en})` : "未设置"}
              </p>
            )}
          </div>

          {/* 风格参考图 */}
          <div className="space-y-2">
            <Label>风格参考图（优先级最高）</Label>
            <p className="text-xs text-muted-foreground">
              上传参考图片以提取艺术风格，系统将仅学习图片的风格特征，不包含人物信息
            </p>
            {editMode ? (
              <div className="space-y-2">
                {storyForm.style_reference_image ? (
                  <div className="relative w-full h-32 border rounded-md overflow-hidden bg-muted">
                    <img
                      src={storyForm.style_reference_image}
                      alt="Style reference"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          上传中...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          上传参考图
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {story.style_reference_image ? (
                  <div className="w-full h-32 border rounded-md overflow-hidden bg-muted">
                    <img
                      src={story.style_reference_image}
                      alt="Style reference"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="w-4 h-4" />
                    <span>未上传</span>
                  </div>
                )}
              </>
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
