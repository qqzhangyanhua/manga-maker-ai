"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Save,
  Eye,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { PromptTemplate, PromptTemplateFormData, ChainOfThoughtLevel } from "../types";
import { FUNCTION_CODES, PHASE_OPTIONS, getEmptyForm } from "../types";
import type { Genre } from "../../genres/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * 提示词模板编辑页面
 */
export default function PromptTemplateEditPage({ params }: PageProps) {
  const { id } = use(params);
  const isNew = id === "new";
  const { toast } = useToast();
  const router = useRouter();

  // 数据状态
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [form, setForm] = useState<PromptTemplateFormData>(getEmptyForm());

  // 预览状态
  const [previewResult, setPreviewResult] = useState<string>("");
  const [previewing, setPreviewing] = useState(false);
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});

  // 获取专题列表
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch("/api/admin/genres?includeInactive=true");
        const result = await response.json();
        if (response.ok) {
          setGenres(result.data || []);
        }
      } catch (error) {
        console.error("获取专题列表失败:", error);
      }
    };
    fetchGenres();
  }, []);

  // 获取模板详情
  useEffect(() => {
    if (isNew) return;

    const fetchTemplate = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/prompt-templates/${id}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "获取模板详情失败");
        }

        const template: PromptTemplate = result.data;
        setForm({
          code: template.code,
          name: template.name,
          description: template.description || "",
          phase: template.phase,
          category: template.category,
          genre: template.genre || "",
          function_code: template.function_code || "",
          system_role: template.system_role,
          chain_of_thought: template.chain_of_thought || [],
          output_schema: template.output_schema
            ? JSON.stringify(template.output_schema, null, 2)
            : "",
          sort_order: template.sort_order,
          is_active: template.is_active,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "获取模板详情失败";
        toast({ title: message, variant: "destructive" });
        router.push("/admin/prompt-templates");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [id, isNew, router, toast]);

  // 保存模板
  const handleSave = async () => {
    if (!form.code.trim()) {
      toast({ title: "请输入模板代码", variant: "destructive" });
      return;
    }
    if (!form.name.trim()) {
      toast({ title: "请输入模板名称", variant: "destructive" });
      return;
    }
    if (!form.system_role.trim()) {
      toast({ title: "请输入系统角色", variant: "destructive" });
      return;
    }

    // 验证 output_schema JSON
    let outputSchema = null;
    if (form.output_schema.trim()) {
      try {
        outputSchema = JSON.parse(form.output_schema);
      } catch {
        toast({ title: "输出格式 JSON 格式错误", variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      const url = isNew
        ? "/api/admin/prompt-templates"
        : `/api/admin/prompt-templates/${id}`;
      const method = isNew ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim() || null,
          phase: form.phase,
          category: form.category,
          genre: form.genre || null,
          function_code: form.function_code || null,
          system_role: form.system_role,
          chain_of_thought: form.chain_of_thought,
          output_schema: outputSchema,
          sort_order: form.sort_order,
          is_active: form.is_active,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "保存失败");
      }

      toast({ title: "保存成功" });
      if (isNew) {
        router.push(`/admin/prompt-templates/${result.data.id}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败";
      toast({ title: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // 预览模板
  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const response = await fetch("/api/admin/prompt-templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_role: form.system_role,
          chain_of_thought: form.chain_of_thought,
          variables: testVariables,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "预览失败");
      }

      setPreviewResult(result.data.rendered_prompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : "预览失败";
      toast({ title: message, variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  // 添加思维链层级
  const addChainLevel = () => {
    setForm({
      ...form,
      chain_of_thought: [
        ...form.chain_of_thought,
        { level: `L${form.chain_of_thought.length + 1}`, title: "", content: [""] },
      ],
    });
  };

  // 删除思维链层级
  const removeChainLevel = (index: number) => {
    setForm({
      ...form,
      chain_of_thought: form.chain_of_thought.filter((_, i) => i !== index),
    });
  };

  // 更新思维链层级
  const updateChainLevel = (index: number, updates: Partial<ChainOfThoughtLevel>) => {
    setForm({
      ...form,
      chain_of_thought: form.chain_of_thought.map((level, i) =>
        i === index ? { ...level, ...updates } : level
      ),
    });
  };

  // 添加思维链内容项
  const addChainContent = (levelIndex: number) => {
    const newChain = [...form.chain_of_thought];
    newChain[levelIndex].content.push("");
    setForm({ ...form, chain_of_thought: newChain });
  };

  // 删除思维链内容项
  const removeChainContent = (levelIndex: number, contentIndex: number) => {
    const newChain = [...form.chain_of_thought];
    newChain[levelIndex].content = newChain[levelIndex].content.filter(
      (_, i) => i !== contentIndex
    );
    setForm({ ...form, chain_of_thought: newChain });
  };

  // 更新思维链内容项
  const updateChainContent = (levelIndex: number, contentIndex: number, value: string) => {
    const newChain = [...form.chain_of_thought];
    newChain[levelIndex].content[contentIndex] = value;
    setForm({ ...form, chain_of_thought: newChain });
  };

  if (loading) {
    return (
      <div className="min-h-screen halftone-pattern">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          <Skeleton className="h-12 w-[300px]" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen halftone-pattern">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="relative">
          <div className="absolute -left-4 -top-4 w-20 h-20 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse" />
          <h1 className="text-4xl font-bold mb-4 flex items-center gap-3 comic-title relative z-10">
            <FileText className="w-10 h-10 text-primary drop-shadow-md" />
            {isNew ? "创建模板" : "编辑模板"}
          </h1>
          <div className="absolute top-0 right-0 z-20 flex gap-2">
            <Link href="/admin/prompt-templates">
              <Button variant="outline" size="sm" className="bg-background">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回列表
              </Button>
            </Link>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="prompt">提示词内容</TabsTrigger>
            <TabsTrigger value="preview">预览测试</TabsTrigger>
          </TabsList>

          {/* 基本信息 */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>基本信息</CardTitle>
                <CardDescription>模板的基本属性和分类</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">模板代码</Label>
                    <Input
                      id="code"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="如 creative-inspiration-001"
                      disabled={!isNew}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">模板名称</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="如 创意灵感收集"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="模板的简短描述"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phase">阶段</Label>
                    <Select
                      value={form.phase}
                      onValueChange={(value) => setForm({ ...form, phase: value })}
                    >
                      <SelectTrigger id="phase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PHASE_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">分类</Label>
                    <Input
                      id="category"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder="如 inspiration"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="genre">专题</Label>
                    <Select
                      value={form.genre || "none"}
                      onValueChange={(value) => setForm({ ...form, genre: value === "none" ? "" : value })}
                    >
                      <SelectTrigger id="genre">
                        <SelectValue placeholder="通用" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">通用（无专题）</SelectItem>
                        {genres.map((g) => (
                          <SelectItem key={g.id} value={g.display_name}>
                            {g.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="function_code">功能代码</Label>
                    <Select
                      value={form.function_code || "none"}
                      onValueChange={(value) => setForm({ ...form, function_code: value === "none" ? "" : value })}
                    >
                      <SelectTrigger id="function_code">
                        <SelectValue placeholder="无" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无</SelectItem>
                        {FUNCTION_CODES.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sort_order">排序</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      min={0}
                      value={form.sort_order}
                      onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>状态</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={form.is_active}
                        onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                      />
                      <span className="text-sm">{form.is_active ? "启用" : "禁用"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 提示词内容 */}
          <TabsContent value="prompt">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>系统角色</CardTitle>
                  <CardDescription>
                    定义 AI 的角色和任务，支持变量占位符如 {"{{genre}}"}, {"{{phase_name}}"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={form.system_role}
                    onChange={(e) => setForm({ ...form, system_role: e.target.value })}
                    placeholder="你是一位专业的网文创作顾问..."
                    rows={10}
                    className="font-mono text-sm"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>思维链指令</CardTitle>
                    <CardDescription>分层级的思考步骤引导</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={addChainLevel}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加层级
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {form.chain_of_thought.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      暂无思维链指令，点击上方按钮添加
                    </p>
                  ) : (
                    form.chain_of_thought.map((level, levelIndex) => (
                      <div key={levelIndex} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-4">
                          <Input
                            value={level.level}
                            onChange={(e) => updateChainLevel(levelIndex, { level: e.target.value })}
                            placeholder="层级标识"
                            className="w-24"
                          />
                          <Input
                            value={level.title}
                            onChange={(e) => updateChainLevel(levelIndex, { title: e.target.value })}
                            placeholder="层级标题"
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeChainLevel(levelIndex)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2 pl-4">
                          {level.content.map((item, contentIndex) => (
                            <div key={contentIndex} className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground w-6">
                                {contentIndex + 1}.
                              </span>
                              <Input
                                value={item}
                                onChange={(e) => updateChainContent(levelIndex, contentIndex, e.target.value)}
                                placeholder="思考步骤"
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeChainContent(levelIndex, contentIndex)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addChainContent(levelIndex)}
                            className="ml-6"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            添加步骤
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>输出格式（JSON Schema）</CardTitle>
                  <CardDescription>可选，定义期望的输出 JSON 结构</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={form.output_schema}
                    onChange={(e) => setForm({ ...form, output_schema: e.target.value })}
                    placeholder='{"type": "object", "properties": {...}}'
                    rows={8}
                    className="font-mono text-sm"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 预览测试 */}
          <TabsContent value="preview">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>测试变量</CardTitle>
                  <CardDescription>输入测试变量值来预览渲染结果</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {["genre", "phase_name", "phase_description", "num_options"].map((varName) => (
                    <div key={varName} className="space-y-2">
                      <Label htmlFor={`var-${varName}`}>{varName}</Label>
                      <Input
                        id={`var-${varName}`}
                        value={testVariables[varName] || ""}
                        onChange={(e) =>
                          setTestVariables({ ...testVariables, [varName]: e.target.value })
                        }
                        placeholder={`输入 ${varName} 的测试值`}
                      />
                    </div>
                  ))}
                  <Button onClick={handlePreview} disabled={previewing} className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    {previewing ? "预览中..." : "预览渲染结果"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>渲染结果</CardTitle>
                  <CardDescription>变量替换后的完整提示词</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={previewResult}
                    readOnly
                    rows={20}
                    className="font-mono text-sm"
                    placeholder="点击预览按钮查看渲染结果"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
