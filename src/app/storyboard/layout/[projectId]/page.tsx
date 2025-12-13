"use client";

import { useState, useRef, useCallback, useEffect, use } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { ArrowLeft, Download, Save, Loader2, Grid, Eye, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CanvasWorkspace, type CanvasController } from "@/components/ImageEditor/CanvasWorkspace";

interface LayoutProject {
  id: string;
  title: string;
  panels: Array<{
    id: string;
    panel_order: number;
    generated_image: string | null;
    description: string;
  }>;
}

interface LayoutVersion {
  id: string;
  label: string;
  canvas_schema: any;
  image_url: string | null;
  created_at: string;
}

export default function LayoutEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.projectId;
  const { toast } = useToast();

  // State
  const [project, setProject] = useState<LayoutProject | null>(null);
  const [layoutVersion, setLayoutVersion] = useState<LayoutVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [historyInfo, setHistoryInfo] = useState({ undo: 0, redo: 0 });

  // Canvas controller
  const canvasRef = useRef<CanvasController>(null);

  // Auto arrange panels in canvas
  const autoArrangePanels = useCallback(async (panels: LayoutProject["panels"]) => {
    if (!canvasRef.current) return;

    try {
      // Calculate canvas height based on panels
      const panelHeight = 600; // Standard height for each panel
      const panelSpacing = 40;
      const topPadding = 60;
      const totalHeight = Math.max(1000, topPadding + panels.length * (panelHeight + panelSpacing));

      // Set canvas size (this will require updating CanvasWorkspace)
      await canvasRef.current.setCanvasHeight?.(totalHeight);

      // Clear existing content
      canvasRef.current.clearOverlays();

      // Add each panel as image
      for (let i = 0; i < panels.length; i++) {
        const panel = panels[i];
        if (panel.generated_image) {
          const y = topPadding + i * (panelHeight + panelSpacing);
          await canvasRef.current.addPanelImage?.({
            url: panel.generated_image,
            x: 100, // Left margin
            y,
            width: 600,
            height: panelHeight,
            panelId: panel.id,
            panelOrder: panel.panel_order,
          });
        }
      }

      toast({
        title: "自动排版完成",
        description: `已自动排列 ${panels.length} 个分镜，可拖拽调整位置`,
      });
    } catch (error) {
      console.error("Auto arrange error:", error);
      toast({
        title: "自动排版失败",
        description: "请手动添加分镜图片",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Load project and layout version
  const loadProjectAndLayout = useCallback(async () => {
    try {
      setLoading(true);

      // Load project
      const projectResponse = await fetch(`/api/project/${projectId}`);
      if (!projectResponse.ok) {
        throw new Error("Failed to load project");
      }
      const projectData = await projectResponse.json();
      const loadedProject = projectData.project;

      // Filter panels with images
      const panelsWithImages = loadedProject.panels.filter(
        (p: { generated_image: string | null }) => p.generated_image
      );

      setProject({
        ...loadedProject,
        panels: panelsWithImages,
      });

      // Load existing layout version
      const versionResponse = await fetch(
        `/api/image/page?project_id=${projectId}&source_type=layout`
      );
      let hasExistingLayout = false;
      if (versionResponse.ok) {
        const versionData = await versionResponse.json();
        const versions = versionData.versions?.filter(
          (v: { source_type: string }) => v.source_type === "layout"
        );
        if (versions && versions.length > 0) {
          const latest = versions[0]; // Already sorted by created_at desc
          setLayoutVersion(latest);
          hasExistingLayout = true;

          // Load schema into canvas
          if (canvasRef.current && latest.canvas_schema) {
            await canvasRef.current.loadSchema(latest.canvas_schema);
          }
        }
      }

      // If no existing layout, auto-arrange panels
      if (!hasExistingLayout && panelsWithImages.length > 0) {
        setTimeout(() => {
          autoArrangePanels(panelsWithImages);
        }, 500);
      }
    } catch (error) {
      console.error("Load error:", error);
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast, autoArrangePanels]);

  useEffect(() => {
    loadProjectAndLayout();
  }, [loadProjectAndLayout]);

  // Save layout
  const handleSave = async () => {
    if (!canvasRef.current || !project) return;

    try {
      setSaving(true);

      const schema = canvasRef.current.exportSchema();

      if (layoutVersion) {
        // Update existing version
        const response = await fetch(`/api/image/page/${layoutVersion.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canvasSchema: schema,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update layout");
        }

        const { version } = await response.json();
        setLayoutVersion(version);
      } else {
        // Create new version
        const response = await fetch("/api/image/page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: `${project.title} 排版`,
            sourceType: "layout",
            projectId: project.id,
            status: "completed",
            canvasSchema: schema,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save layout");
        }

        const { version } = await response.json();
        setLayoutVersion(version);
      }

      toast({
        title: "保存成功",
        description: "排版已保存到云端",
      });
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Export to long image
  const handleExport = async () => {
    if (!canvasRef.current || !project) return;

    try {
      setExporting(true);

      const dataUrl = await canvasRef.current.exportImage();
      if (!dataUrl) {
        throw new Error("Failed to export image");
      }

      // Convert to blob and download
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.title}_layout_${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "导出成功",
        description: "长图已下载到本地",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">项目不存在或没有可用的分镜图片</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Header Bar */}
      <div className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/storyboard/editor/${projectId}`}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回分镜编辑
            </Link>
            <div className="flex items-center gap-2">
              <Grid className="w-5 h-5 text-primary" />
              <h1 className="font-comic text-xl text-foreground">{project.title} - 排版</h1>
            </div>
            <span className="px-2 py-1 rounded text-xs bg-muted text-muted-foreground">
              {project.panels.length} 张图片
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* History controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => canvasRef.current?.undo()}
                disabled={historyInfo.undo === 0}
                title="撤销 (⌘+Z)"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => canvasRef.current?.redo()}
                disabled={historyInfo.redo === 0}
                title="重做 (⌘+Shift+Z)"
              >
                <RotateCw className="w-4 h-4" />
              </Button>
            </div>

            {/* Action buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => project && autoArrangePanels(project.panels)}
            >
              <Grid className="w-4 h-4 mr-2" />
              重新排版
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
            
            <Button variant="comic" size="sm" onClick={handleExport} disabled={exporting}>
              {exporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Download className="w-4 h-4 mr-2" />
              导出长图
            </Button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex overflow-hidden">
        <CanvasWorkspace
          ref={canvasRef}
          onHistoryChange={setHistoryInfo}
          autoHeight={true}
        />
      </div>

      {/* Instructions */}
      <div className="border-t border-border bg-muted/30 px-4 py-2">
        <p className="text-sm text-muted-foreground text-center">
          💡 提示：拖拽图片调整位置，双击添加对白，使用右上角按钮保存和导出
        </p>
      </div>
    </div>
  );
}