"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TemplateWithMeta } from "@/types/template";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TemplateDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateWithMeta | null;
}

export const TemplateDetailDialog = ({ open, onOpenChange, template }: TemplateDetailDialogProps) => {
  const { toast } = useToast();
  const meta = template?.template_data?.meta;

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "已复制", description: `${label} 已复制到剪贴板` });
    }).catch(() => {
      toast({ title: "复制失败", description: "请手动选择文本复制", variant: "destructive" });
    });
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {template.name}
            {template.is_official && <Badge>官方</Badge>}
            {meta?.category && <Badge variant="secondary">{meta.category}</Badge>}
            {meta?.complexityLevel && (
              <Badge variant="secondary">
                {meta.complexityLevel === "pro" ? "进阶" : "新手友好"}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{template.description || "暂无描述"}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4 space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              推荐分镜：{meta?.recommendedPanelCount ?? template.panel_count} 格
              {meta?.recommendedCharacters && (
                <span className="ml-3">
                  角色建议：{meta.recommendedCharacters.min ?? "-"} - {meta.recommendedCharacters.max ?? "-"} 人
                </span>
              )}
            </div>
          </div>

          {meta?.beats && meta.beats.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">剧情节拍</h4>
                <Button variant="ghost" size="sm" onClick={() => copyText(meta.beats!.map(b => `${b.title}: ${b.summary}`).join("\n"), "节拍")}>
                  <Copy className="h-4 w-4 mr-1" /> 复制节拍
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {meta.beats.map((beat, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-card/60">
                    <div className="text-sm font-semibold">{idx + 1}. {beat.title}</div>
                    <p className="text-sm text-muted-foreground mt-1">{beat.summary}</p>
                    {beat.scene && <p className="text-xs text-muted-foreground mt-1">场景：{beat.scene}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(meta?.promptSnippets?.length || meta?.negativePrompts?.length) && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">提示词片段</h4>
                {meta?.promptSnippets && meta.promptSnippets.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => copyText(meta.promptSnippets!.join(", "), "提示词片段")}>
                    <Copy className="h-4 w-4 mr-1" /> 复制正向提示
                  </Button>
                )}
              </div>
              {meta?.promptSnippets && meta.promptSnippets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {meta.promptSnippets.map((snippet) => (
                    <Badge key={snippet} variant="secondary">{snippet}</Badge>
                  ))}
                </div>
              )}
              {meta?.negativePrompts && meta.negativePrompts.length > 0 && (
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">负向提示</div>
                  <div className="flex flex-wrap gap-2">
                    {meta.negativePrompts.map((snippet) => (
                      <Badge key={snippet} variant="outline">{snippet}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {meta?.cameraPlan && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">镜头分布建议</h4>
                <Button variant="ghost" size="sm" onClick={() => copyText(JSON.stringify(meta.cameraPlan, null, 2), "镜头分布")}>
                  <Copy className="h-4 w-4 mr-1" /> 复制分布
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                全景 {meta.cameraPlan.wide ?? 0} · 中景 {meta.cameraPlan.medium ?? 0} · 特写 {meta.cameraPlan.closeup ?? 0}
                {meta.cameraPlan.special && meta.cameraPlan.special.length > 0 && (
                  <span className="ml-3">特殊镜头：{meta.cameraPlan.special.join(" / ")}</span>
                )}
              </div>
            </section>
          )}

          {meta?.layoutPresets && meta.layoutPresets.length > 0 && (
            <section className="space-y-2">
              <h4 className="font-semibold text-foreground">布局建议</h4>
              <div className="flex flex-wrap gap-2">
                {meta.layoutPresets.map((layout) => (
                  <Badge key={layout} variant="outline">{layout}</Badge>
                ))}
              </div>
            </section>
          )}

          {meta?.dialogueGuidelines && (
            <section className="space-y-2">
              <h4 className="font-semibold text-foreground">对白建议</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>每气泡行数 ≤ {meta.dialogueGuidelines.maxLinesPerBubble ?? "?"}</div>
                <div>每行字数 ≤ {meta.dialogueGuidelines.maxCharsPerBubble ?? "?"}</div>
                {meta.dialogueGuidelines.tone && <div>语气：{meta.dialogueGuidelines.tone}</div>}
                {meta.dialogueGuidelines.tips && meta.dialogueGuidelines.tips.length > 0 && (
                  <div>提示：{meta.dialogueGuidelines.tips.join(" / ")}</div>
                )}
              </div>
            </section>
          )}

          {template.template_data?.panels && (
            <section className="space-y-2">
              <Separator />
              <h4 className="font-semibold text-foreground">分镜配置</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                {template.template_data.panels.map((panel, idx) => (
                  <div key={idx} className="rounded-lg border p-2">
                    <div className="text-foreground font-semibold">分镜 {idx + 1}</div>
                    <div>类型：{panel.panel_type || "未设定"}</div>
                    <div>景别：{panel.shot_size || "未设定"}</div>
                    <div>角度：{panel.camera_angle || "未设定"}</div>
                    <div>权重：{panel.importance || "medium"}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
