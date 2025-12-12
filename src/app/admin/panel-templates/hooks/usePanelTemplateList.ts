import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { PanelTemplate } from "../types";

export const usePanelTemplateList = () => {
  const [templates, setTemplates] = useState<PanelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/panel-templates");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setTemplates(data.data || []);
    } catch (error) {
      toast({ title: "加载失败", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleTogglePublic = async (template: PanelTemplate) => {
    try {
      const res = await fetch(`/api/admin/panel-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !template.is_public }),
      });

      if (!res.ok) throw new Error("切换失败");

      toast({ title: template.is_public ? "已设为私有" : "已设为公开" });
      fetchTemplates();
    } catch (error) {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };

  const handleToggleOfficial = async (template: PanelTemplate) => {
    try {
      const res = await fetch(`/api/admin/panel-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_official: !template.is_official }),
      });

      if (!res.ok) throw new Error("切换失败");

      toast({ title: template.is_official ? "已取消官方" : "已标记为官方" });
      fetchTemplates();
    } catch (error) {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      const res = await fetch(`/api/admin/panel-templates/${templateId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("删除失败");

      toast({ title: "删除成功" });
      fetchTemplates();
    } catch (error) {
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  return {
    templates,
    loading,
    fetchTemplates,
    handleTogglePublic,
    handleToggleOfficial,
    handleDelete,
  };
};
