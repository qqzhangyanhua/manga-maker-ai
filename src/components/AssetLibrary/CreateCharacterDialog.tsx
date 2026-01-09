import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2, Palette, Upload, Wand2 } from "lucide-react";
import ImageUpload from "./ImageUpload";
import { useToast } from "@/hooks/use-toast";
import type { CharacterAsset, ComicStyle } from "./CharacterLibrary";
import { RoleSelector, type CharacterRole } from "@/components/character/RoleSelector";
import type { CharacterRecommendation } from "@/app/scripts/[id]/types/ai-recommendation";

interface CreateCharacterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (character: CharacterAsset, role?: CharacterRole) => Promise<void>;

  // Phase 2.0 optional props
  defaultRole?: CharacterRole;
  showRoleSelector?: boolean;
  contextMode?: 'library' | 'story';

  // Phase 2.1: AI 推荐支持
  recommendations?: CharacterRecommendation[];
}

type CreateMode = "manual" | "ai";

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

const parseErrorResponse = async (response: Response): Promise<string> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    try {
      const data = await response.json();
      if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
        return data.error;
      }
      if (data && typeof data === "object" && "code" in data && data.code === "QUOTA_EXCEEDED") {
        const { used, limit } = data as { used?: unknown; limit?: unknown };
        if (typeof used === "number" && typeof limit === "number") {
          return `今日图像生成配额已用完（${used}/${limit}）`;
        }
        return "今日图像生成配额已用完";
      }
    } catch {
      // Fallback to text
    }
  }

  try {
    const text = await response.text();
    return text.trim() || `请求失败 (${response.status})`;
  } catch {
    return `请求失败 (${response.status})`;
  }
};

const CreateCharacterDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultRole = "supporting",
  showRoleSelector = false,
  contextMode = 'library',
  recommendations = [], // Phase 2.1
}: CreateCharacterDialogProps) => {
  const [createMode, setCreateMode] = useState<CreateMode>("manual");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  // Phase 2.0: Role selection state
  const [selectedRole, setSelectedRole] = useState<CharacterRole>(defaultRole);

  const submitAbortRef = useRef<AbortController | null>(null);
  const generateAbortRef = useRef<AbortController | null>(null);

  // Phase 2.1: 处理推荐点击 - 自动填充描述
  const handleRecommendationClick = (recommendation: CharacterRecommendation) => {
    // 如果用户还没有填写描述，使用 AI 推荐的描述
    if (!description.trim()) {
      setDescription(recommendation.suggested_description);
      toast({
        title: "AI 推荐已应用",
        description: `已自动填充${getRoleLabel(recommendation.role)}角色的典型描述`,
      });
    }
  };

  useEffect(() => {
    return () => {
      submitAbortRef.current?.abort();
      generateAbortRef.current?.abort();
    };
  }, []);

  // AI generation states
  const [stylePrompt, setStylePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>("");

  // Comic style selection
  const [styles, setStyles] = useState<ComicStyle[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>("__none__");
  const [stylesLoading, setStylesLoading] = useState(false);

  // Fetch comic styles when dialog opens
  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    let ignore = false;

    const fetchStyles = async () => {
      setStylesLoading(true);
      try {
        const response = await fetch("/api/comic-styles", { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          if (!ignore) {
            setStyles(data.data || []);
          }
        }
      } catch (error) {
        if (!isAbortError(error)) {
          console.error("Error fetching comic styles:", error);
        }
      } finally {
        if (!ignore) {
          setStylesLoading(false);
        }
      }
    };

    fetchStyles();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("角色名称不能为空");
      return;
    }

    submitAbortRef.current?.abort();
    const controller = new AbortController();
    submitAbortRef.current = controller;

    setIsSubmitting(true);

    try {
      // 准备表单数据
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("tags", JSON.stringify([]));

      // Add comic style if selected
      if (selectedStyleId && selectedStyleId !== "__none__") {
        formData.append("comic_style_id", selectedStyleId);
      }

      // Handle AI-generated image (MinIO URL)
      if (createMode === "ai" && generatedImageUrl) {
        setUploadProgress("正在保存 AI 生成的角色...");
        // Use the MinIO URL directly instead of re-uploading
        formData.append("ai_generated_image_url", generatedImageUrl);
      }
      // Handle manual uploaded images
      else if (imageFiles.length > 0) {
        setUploadProgress(`正在创建角色并上传 ${imageFiles.length} 张图片...`);
        imageFiles.forEach((file, index) => {
          formData.append(`images[${index}]`, file);
        });
      } else {
        setUploadProgress("正在创建角色...");
      }

      // 一次性提交到后端
      const response = await fetch("/api/character", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage || "创建角色失败");
      }

      const result = await response.json();
      if (!result?.character) {
        throw new Error("创建角色返回数据异常");
      }

      // Reset form first
      setCreateMode("manual");
      setName("");
      setDescription("");
      setImageFiles([]);
      setStylePrompt("");
      setGeneratedImageUrl("");
      setSelectedStyleId("__none__");
      setSelectedRole(defaultRole); // Reset to default role
      setUploadProgress("");
      onOpenChange(false);

      toast({
        title: "角色创建成功",
        description: result.message || `${result.character.name} 已创建`,
      });

      // 通知父组件刷新列表（解耦错误处理）
      // Phase 2.0: Pass selected role to callback
      try {
        await onSubmit(result.character as CharacterAsset, showRoleSelector ? selectedRole : undefined);
      } catch (callbackError) {
        console.warn("角色创建成功，但列表刷新失败:", callbackError);
      }
    } catch (err) {
      if (isAbortError(err)) return;
      console.error("Create character error:", err);
      setError(err instanceof Error ? err.message : "创建失败，请重试");
      toast({
        title: "创建失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      if (submitAbortRef.current === controller) {
        setIsSubmitting(false);
        setUploadProgress("");
        submitAbortRef.current = null;
      }
    }
  };

  // AI Generation Handler
  const handleAIGenerate = async () => {
    if (!stylePrompt.trim()) {
      setError("请输入风格描述");
      return;
    }

    generateAbortRef.current?.abort();
    const controller = new AbortController();
    generateAbortRef.current = controller;

    setError("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/character/generate-from-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style_prompt: stylePrompt.trim(),
          comic_style_id: selectedStyleId !== "__none__" ? selectedStyleId : null,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage || "生成失败");
      }

      const result = await response.json();

      // Fill form with generated data
      setName(result.character.name);
      setDescription(result.character.description);
      setGeneratedImageUrl(result.character.image_url);

      toast({
        title: "角色生成成功",
        description: "请确认信息后点击创建按钮保存角色",
      });
    } catch (err) {
      if (isAbortError(err)) return;
      console.error("AI generation error:", err);
      setError(err instanceof Error ? err.message : "生成失败，请重试");
      toast({
        title: "生成失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      if (generateAbortRef.current === controller) {
        setIsGenerating(false);
        generateAbortRef.current = null;
      }
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !isGenerating) {
      setCreateMode("manual");
      setName("");
      setDescription("");
      setImageFiles([]);
      setStylePrompt("");
      setGeneratedImageUrl("");
      setSelectedStyleId("__none__");
      setSelectedRole(defaultRole); // Reset to default role
      setUploadProgress("");
      setError("");
      onOpenChange(false);
    }
  };

  const handleImageUpload = (files: File[]) => {
    setImageFiles(files);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    handleClose();
  };

  const handleCreateModeChange = (value: string) => {
    if (value !== "manual" && value !== "ai") return;
    setError("");
    setImageFiles([]);
    setGeneratedImageUrl("");
    setCreateMode(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-comic">
            <Sparkles className="w-6 h-6 text-primary" />
            创建新角色
          </DialogTitle>
          <DialogDescription>
            打造你的"数字演员"，开始你的创作之旅
          </DialogDescription>
        </DialogHeader>

        <Tabs value={createMode} onValueChange={handleCreateModeChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              手动创建
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              AI 生成
            </TabsTrigger>
          </TabsList>

          {/* Manual Mode */}
          <TabsContent value="manual" className="space-y-6 py-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 图片上传区域 */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  角色参考图
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  上传角色参考图用于训练 LoRA 模型（可选，第一张将作为基础形象）
                </p>
                <ImageUpload
                  onUpload={handleImageUpload}
                  maxFiles={5}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-semibold">
                  角色名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="例如：赛博朋克少女、幻想战士..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  className="h-11"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  {name.length}/50 字符
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-semibold">
                  角色描述
                </Label>
                <Textarea
                  id="description"
                  placeholder="描述角色的外观、性格、特征...&#10;例如：蓝色双马尾，赛博朋克风格，自信的眼神，科技感十足的装备"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  className="min-h-[120px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/500 字符 · 详细的描述有助于生成更准确的角色
                </p>
              </div>

              {/* Phase 2.0: Role Selector (only in story context) */}
              {showRoleSelector && (
                <RoleSelector
                  value={selectedRole}
                  onChange={setSelectedRole}
                  disabled={isSubmitting}
                  recommendations={recommendations}
                  onRecommendationClick={handleRecommendationClick}
                />
              )}

              {/* Comic Style Selection */}
              <div className="space-y-2">
                <Label htmlFor="comic-style" className="text-base font-semibold flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  漫画风格
                </Label>
                <Select
                  value={selectedStyleId}
                  onValueChange={setSelectedStyleId}
                  disabled={isSubmitting || stylesLoading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={stylesLoading ? "加载中..." : "选择漫画风格（可选）"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无风格</SelectItem>
                    {styles.map((style) => (
                      <SelectItem key={style.id} value={style.id}>
                        <div className="flex items-center gap-2">
                          {style.image_url && (
                            <img
                              src={style.image_url}
                              alt={style.name_zh}
                              className="w-5 h-5 rounded object-cover"
                            />
                          )}
                          <span>{style.name_zh}</span>
                          <span className="text-xs text-muted-foreground">({style.name_en})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  选择一个漫画风格可以让角色保持统一的美术风格
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3"
                >
                  {error}
                </div>
              )}

              {uploadProgress && (
                <div className="text-sm text-primary bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress}
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  variant="comic"
                  disabled={isSubmitting || !name.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      创建角色
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* AI Generation Mode */}
          <TabsContent value="ai" className="space-y-6 py-4">
            <div className="space-y-6">
              {/* AI Generation Input */}
              <div className="space-y-2">
                <Label htmlFor="style-prompt" className="text-base font-semibold">
                  风格描述 <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="style-prompt"
                  placeholder="描述你想要的角色风格...&#10;例如：赛博朋克风格的少女，蓝色双马尾，戴着科技护目镜"
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  disabled={isGenerating || isSubmitting}
                  className="min-h-[100px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {stylePrompt.length}/500 字符 · AI 将根据你的描述自动生成角色
                </p>
              </div>

              {/* Comic Style Selection */}
              <div className="space-y-2">
                <Label htmlFor="ai-comic-style" className="text-base font-semibold flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  漫画风格
                </Label>
                <Select
                  value={selectedStyleId}
                  onValueChange={setSelectedStyleId}
                  disabled={isGenerating || isSubmitting || stylesLoading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={stylesLoading ? "加载中..." : "选择漫画风格（可选）"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无风格</SelectItem>
                    {styles.map((style) => (
                      <SelectItem key={style.id} value={style.id}>
                        <div className="flex items-center gap-2">
                          {style.image_url && (
                            <img
                              src={style.image_url}
                              alt={style.name_zh}
                              className="w-5 h-5 rounded object-cover"
                            />
                          )}
                          <span>{style.name_zh}</span>
                          <span className="text-xs text-muted-foreground">({style.name_en})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  选择一个漫画风格可以让角色保持统一的美术风格
                </p>
              </div>

              {/* Generate Button */}
              <Button
                type="button"
                variant="comic"
                onClick={handleAIGenerate}
                disabled={isGenerating || isSubmitting || !stylePrompt.trim()}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI 生成中...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    AI 生成角色
                  </>
                )}
              </Button>

              {/* Generated Preview */}
              {generatedImageUrl && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <Label className="text-base font-semibold">生成预览</Label>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img
                      src={generatedImageUrl}
                      alt="AI 生成的角色"
                      className="w-full h-auto"
                    />
                  </div>

                  {/* Editable Fields */}
                  <div className="space-y-2">
                    <Label htmlFor="ai-name" className="text-base font-semibold">
                      角色名称
                    </Label>
                    <Input
                      id="ai-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isSubmitting}
                      className="h-11"
                      maxLength={50}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai-description" className="text-base font-semibold">
                      角色描述
                    </Label>
                    <Textarea
                      id="ai-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isSubmitting}
                      className="min-h-[120px] resize-none"
                      maxLength={500}
                    />
                  </div>

                  {/* Phase 2.0: Role Selector (only in story context) */}
                  {showRoleSelector && (
                    <RoleSelector
                      value={selectedRole}
                      onChange={setSelectedRole}
                      disabled={isSubmitting}
                      recommendations={recommendations}
                      onRecommendationClick={handleRecommendationClick}
                    />
                  )}
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3"
                >
                  {error}
                </div>
              )}

              {uploadProgress && (
                <div className="text-sm text-primary bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress}
                </div>
              )}

              {/* Save Button (only shown after generation) */}
              {generatedImageUrl && (
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    取消
                  </Button>
                  <Button
                    type="button"
                    variant="comic"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !name.trim()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        保存角色
                      </>
                    )}
                  </Button>
                </DialogFooter>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

/**
 * 获取角色类型标签
 */
function getRoleLabel(role: CharacterRole): string {
  const labels: Record<CharacterRole, string> = {
    protagonist: "主角",
    antagonist: "反派",
    supporting: "配角",
    minor: "龙套",
  };
  return labels[role];
}

export default CreateCharacterDialog;
