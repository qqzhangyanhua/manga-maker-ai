"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Upload, LayoutGrid, MessageSquare, RotateCcw, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionSidebarProps = {
  isOptimizing: boolean;
  onOptimize: (payload: { style: string; strength: number; prompt: string }) => void;
  onTemplateSelect: (type: "single" | "two-column" | "three-grid") => void;
  onAddBubble: () => void;
  onClearOverlays: () => void;
  onUploadFile: (file: File) => void;
  onLoadFromUrl: (url: string) => void;
  onExportImage: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  activeTemplate?: string | null;
};

const ActionSidebar = ({
  isOptimizing,
  onOptimize,
  onTemplateSelect,
  onAddBubble,
  onClearOverlays,
  onUploadFile,
  onLoadFromUrl,
  onExportImage,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  activeTemplate,
}: ActionSidebarProps) => {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [strength, setStrength] = useState(60);
  const [imageUrl, setImageUrl] = useState("");

  const handleOptimize = () => {
    onOptimize({ style, strength, prompt });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  const handleUrlLoad = () => {
    if (imageUrl.trim()) {
      onLoadFromUrl(imageUrl.trim());
      setImageUrl("");
    }
  };

  return (
    <aside className="w-full lg:w-[360px] border border-border rounded-xl p-4 bg-card/80 backdrop-blur space-y-4">
      <Tabs defaultValue="optimize">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="optimize">AI 调优</TabsTrigger>
          <TabsTrigger value="layout">分格布局</TabsTrigger>
          <TabsTrigger value="assets">素材</TabsTrigger>
        </TabsList>

        <TabsContent value="optimize" className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">调优提示语</Label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述希望提升的效果，如：增强光影对比、突出人物表情。"
              className="w-full min-h-[100px] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">风格模板</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger>
                <SelectValue placeholder="选择风格" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cinematic">电影感</SelectItem>
                <SelectItem value="manga">日漫黑白</SelectItem>
                <SelectItem value="color-pop">彩色流行</SelectItem>
                <SelectItem value="noir">复古胶片</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center justify-between">
              优化强度
              <span className="text-xs text-muted-foreground">{strength}%</span>
            </Label>
            <Slider value={[strength]} onValueChange={(v) => setStrength(v[0] ?? 50)} min={10} max={100} />
          </div>
          <Button onClick={handleOptimize} disabled={isOptimizing} className="w-full">
            <Sparkles className={cn("w-4 h-4 mr-2", isOptimizing && "animate-spin")} />
            {isOptimizing ? "AI 正在优化..." : "执行 AI 优化"}
          </Button>
          <p className="text-xs text-muted-foreground">
            每次调优会保留一个版本，你可以在右侧时间线随时回退。
          </p>
        </TabsContent>

        <TabsContent value="layout" className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={activeTemplate === "single" ? "comic" : "outline"}
              onClick={() => onTemplateSelect("single")}
              className="flex flex-col gap-1 py-6"
            >
              <LayoutGrid className="w-5 h-5" />
              全幅
            </Button>
            <Button
              variant={activeTemplate === "two-column" ? "comic" : "outline"}
              onClick={() => onTemplateSelect("two-column")}
              className="flex flex-col gap-1 py-6"
            >
              <LayoutGrid className="w-5 h-5" />
              双列
            </Button>
            <Button
              variant={activeTemplate === "three-grid" ? "comic" : "outline"}
              onClick={() => onTemplateSelect("three-grid")}
              className="flex flex-col gap-1 py-6"
            >
              <LayoutGrid className="w-5 h-5" />
              九宫
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {activeTemplate ? `当前分格模板：${activeTemplate}` : "未选择模板"}
          </p>
          <div className="space-y-2">
            <Label className="text-sm font-medium">对白气泡</Label>
            <Button variant="secondary" className="w-full" onClick={onAddBubble}>
              <MessageSquare className="w-4 h-4 mr-2" />
              添加气泡
            </Button>
          </div>
          <Button variant="ghost" onClick={onClearOverlays}>
            清除分格/气泡
          </Button>
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-dashed border-border/60">
            <Button variant="outline" className="flex-1" onClick={onUndo} disabled={!canUndo}>
              <RotateCcw className="w-4 h-4 mr-1" />
              撤销
            </Button>
            <Button variant="outline" className="flex-1" onClick={onRedo} disabled={!canRedo}>
              <RotateCw className="w-4 h-4 mr-1" />
              重做
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">上传图片</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*" onChange={handleFileChange} className="cursor-pointer" />
            </div>
            <p className="text-xs text-muted-foreground">支持 PNG、JPG，文件最大 4MB。</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">通过 URL 加载</Label>
            <div className="flex items-center gap-2">
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
              <Button variant="secondary" onClick={handleUrlLoad}>
                载入
              </Button>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={onExportImage}>
            <Upload className="w-4 h-4 mr-2" />
            导出当前画面
          </Button>
        </TabsContent>
      </Tabs>
    </aside>
  );
};

export default ActionSidebar;
