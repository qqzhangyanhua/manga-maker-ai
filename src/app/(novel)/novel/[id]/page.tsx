/**
 * 小说项目详情页 - 章节管理和编辑
 */
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, BookOpen, Settings, Globe, Users, FileText } from "lucide-react";
import { ChapterList } from "./components/ChapterList";
import { ChapterEditor } from "./components/ChapterEditor";
import { ProjectSettings } from "./components/ProjectSettings";
import { WorldSettingEditor } from "./components/WorldSettingEditor";
import { CharacterManager } from "./components/CharacterManager";
import { OutlineEditor } from "./components/OutlineEditor";
import { ExportDialog } from "./components/ExportDialog";
import { SearchDialog } from "./components/SearchDialog";
import { GenerateOutlineDialog } from "./components/GenerateOutlineDialog";
import { ContinueOutlineDialog } from "./components/ContinueOutlineDialog";
import { toast } from "sonner";

interface ChapterOutline {
  chapterNumber: number;
  title: string;
  outline: string;
  keyEvents: string[];
  characters: string[];
  plotLines: string[];
  isKeyChapter: boolean;
  // 新增：实际内容字段
  content?: string;
  wordCount?: number;
  status?: "draft" | "completed";
}

/**
 * 转换后端 snake_case 格式的 outline 为前端 camelCase 格式
 */
function normalizeOutline(outline: any): ChapterOutline {
  return {
    chapterNumber: outline.chapterNumber ?? outline.chapter_number ?? 0,
    title: outline.title ?? "",
    outline: outline.outline ?? "",
    keyEvents: outline.keyEvents ?? outline.key_events ?? [],
    characters: outline.characters ?? [],
    plotLines: outline.plotLines ?? outline.plot_lines ?? [],
    isKeyChapter: outline.isKeyChapter ?? outline.is_key_chapter ?? false,
    content: outline.content ?? "",
    wordCount: outline.wordCount ?? outline.word_count ?? 0,
    status: outline.status ?? "draft",
  };
}

/**
 * 转换前端 camelCase 格式的 outline 为后端 snake_case 格式
 */
function denormalizeOutline(outline: ChapterOutline): any {
  return {
    chapter_number: outline.chapterNumber,
    title: outline.title,
    outline: outline.outline,
    key_events: outline.keyEvents,
    characters: outline.characters,
    plot_lines: outline.plotLines,
    is_key_chapter: outline.isKeyChapter,
    content: outline.content,
    word_count: outline.wordCount,
    status: outline.status,
  };
}

interface NovelProject {
  id: string;
  title: string;
  description: string | null;
  genre: string | null;
  target_words: number | null;
  status: string;
  total_words: number;
  chapter_count: number;
  world_setting: Record<string, unknown> | null;
  characters: unknown[] | null;
  outlines: ChapterOutline[] | null;
}

export default function NovelProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<NovelProject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<ChapterOutline | null>(null);
  const [loading, setLoading] = useState(true);
  const [outlines, setOutlines] = useState<ChapterOutline[]>([]);
  const [isGenerateOutlineDialogOpen, setIsGenerateOutlineDialogOpen] = useState(false);
  const [isContinueOutlineDialogOpen, setIsContinueOutlineDialogOpen] = useState(false);

  useEffect(() => {
    async function loadAllData() {
      try {
        console.log(`[loadAllData] 开始加载所有数据，projectId: ${projectId}`);
        setLoading(true);
        await Promise.all([
          fetchProject(),
          fetchOutlines()
        ]);
        console.log(`[loadAllData] 所有数据加载完成`);
      } catch (error) {
        console.error("[loadAllData] 加载数据失败:", error);
        toast.error("加载数据失败");
      } finally {
        setLoading(false);
        console.log(`[loadAllData] loading状态设置为false`);
      }
    }

    if (projectId) {
      loadAllData();
    }
  }, [projectId]);

  async function fetchProject() {
    try {
      console.log(`[fetchProject] 开始请求: /api/novel/projects/${projectId}`);
      const response = await fetch(`/api/novel/projects/${projectId}`);
      console.log(`[fetchProject] 响应状态:`, response.status);

      if (response.ok) {
        const data = await response.json();
        console.log(`[fetchProject] 获取到项目数据:`, data);
        setProject(data);
        // 同时加载大纲数据并转换格式
        if (data.outlines && Array.isArray(data.outlines)) {
          const normalizedOutlines = data.outlines.map(normalizeOutline);
          console.log(`[fetchProject] 转换后的大纲数据:`, normalizedOutlines);
          setOutlines(normalizedOutlines);
        }
      } else {
        const errorData = await response.json();
        console.error(`[fetchProject] 请求失败:`, errorData);
        throw new Error(errorData.error || "获取项目失败");
      }
    } catch (error) {
      console.error("[fetchProject] 异常:", error);
      toast.error("获取项目失败");
      throw error;
    }
  }

  async function fetchOutlines() {
    try {
      console.log(`[fetchOutlines] 开始请求: /api/novel/projects/${projectId}/outlines`);
      const response = await fetch(`/api/novel/projects/${projectId}/outlines`);
      console.log(`[fetchOutlines] 响应状态:`, response.status);

      if (response.ok) {
        const data = await response.json();
        console.log(`[fetchOutlines] 获取到大纲数据:`, data);
        if (data.outlines && Array.isArray(data.outlines)) {
          const normalizedOutlines = data.outlines.map(normalizeOutline);
          console.log(`[fetchOutlines] 转换后的大纲数据:`, normalizedOutlines);
          setOutlines(normalizedOutlines);
        } else {
          setOutlines([]);
        }
      } else {
        const errorData = await response.json();
        console.error(`[fetchOutlines] 请求失败:`, errorData);
      }
    } catch (error) {
      console.error("[fetchOutlines] 异常:", error);
    }
  }

  async function handleCreateChapter() {
    const newChapterNumber = outlines.length + 1;

    try {
      const newOutline: ChapterOutline = {
        chapterNumber: newChapterNumber,
        title: `第 ${newChapterNumber} 章`,
        outline: "",
        keyEvents: [],
        characters: [],
        plotLines: [],
        isKeyChapter: false,
        content: "",
        wordCount: 0,
        status: "draft",
      };

      const updatedOutlines = [...outlines, newOutline];
      setOutlines(updatedOutlines);
      setSelectedChapter(newOutline);

      // 保存到后端
      const backendOutlines = updatedOutlines.map(denormalizeOutline);
      const response = await fetch(`/api/novel/projects/${projectId}/outlines`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlines: backendOutlines }),
      });

      if (response.ok) {
        toast.success("章节创建成功");
      } else {
        throw new Error("创建失败");
      }
    } catch (error) {
      console.error("创建章节失败:", error);
      toast.error("创建章节失败");
    }
  }

  function handleChapterSelect(chapter: ChapterOutline) {
    setSelectedChapter(chapter);
  }

  async function handleChapterUpdate(updatedChapter: ChapterOutline) {
    try {
      // 更新本地状态
      const updatedOutlines = outlines.map((outline) =>
        outline.chapterNumber === updatedChapter.chapterNumber ? updatedChapter : outline
      );
      setOutlines(updatedOutlines);
      setSelectedChapter(updatedChapter);

      // 保存到后端
      const backendOutlines = updatedOutlines.map(denormalizeOutline);
      const response = await fetch(`/api/novel/projects/${projectId}/outlines`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlines: backendOutlines }),
      });

      if (!response.ok) {
        throw new Error("保存失败");
      }
    } catch (error) {
      console.error("更新章节失败:", error);
      toast.error("保存失败");
    }
  }

  console.log(`[Render] loading=${loading}, project=`, project);

  if (loading || !project) {
    console.log(`[Render] 显示加载骨架屏: loading=${loading}, project=${!!project}`);
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-12 gap-6 mt-8">
            <div className="col-span-3 h-96 bg-gray-200 rounded"></div>
            <div className="col-span-9 h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  console.log(`[Render] 渲染项目详情页: ${project.title}`);

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* 项目头部 */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
            <p className="text-muted-foreground">
              {project.description || "暂无描述"}
            </p>
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <span>{project.chapter_count} 章</span>
              <span>{project.total_words.toLocaleString()} 字</span>
              {project.genre && <span>{project.genre}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <SearchDialog
              projectId={projectId}
              onSelectChapter={async (chapterId) => {
                // 由于现在使用 chapterNumber 而非 id，需要从查询参数中解析 chapter_number
                const chapterNumber = parseInt(chapterId);
                if (!isNaN(chapterNumber)) {
                  const chapter = outlines.find((outline) => outline.chapterNumber === chapterNumber);
                  if (chapter) {
                    setSelectedChapter(chapter);
                    toast.success(`已跳转到第 ${chapter.chapterNumber} 章`);
                  }
                }
              }}
            />
            <ExportDialog projectId={projectId} projectTitle={project.title} />
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <Tabs defaultValue="chapters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chapters">
            <BookOpen className="h-4 w-4 mr-2" />
            章节管理
          </TabsTrigger>
          <TabsTrigger value="outline">
            <FileText className="h-4 w-4 mr-2" />
            故事大纲
          </TabsTrigger>
          <TabsTrigger value="characters">
            <Users className="h-4 w-4 mr-2" />
            角色管理
          </TabsTrigger>
          <TabsTrigger value="world">
            <Globe className="h-4 w-4 mr-2" />
            世界观
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            项目设置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chapters" className="space-y-4">
          <div className="grid grid-cols-12 gap-6">
            {/* 左侧：章节列表 */}
            <div className="col-span-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">章节列表</CardTitle>
                    <Button size="sm" onClick={handleCreateChapter}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ChapterList
                    chapters={outlines}
                    selectedChapter={selectedChapter}
                    onSelect={handleChapterSelect}
                    loading={loading}
                  />
                </CardContent>
              </Card>
            </div>

            {/* 右侧：章节编辑器 */}
            <div className="col-span-9">
              {selectedChapter ? (
                <ChapterEditor
                  chapter={selectedChapter}
                  project={project}
                  onUpdate={handleChapterUpdate}
                />
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center py-12">
                    <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      选择一个章节开始编辑，或创建新章节
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="outline">
          <OutlineEditor
            projectId={projectId}
            initialOutlines={outlines}
            onSave={async (newOutlines) => {
              try {
                // 转换为后端格式
                const backendOutlines = newOutlines.map(denormalizeOutline);

                const response = await fetch(`/api/novel/projects/${projectId}/outlines`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ outlines: backendOutlines }),
                });

                if (response.ok) {
                  setOutlines(newOutlines);
                  toast.success("大纲保存成功");
                } else {
                  toast.error("保存失败");
                }
              } catch (error) {
                console.error("保存大纲失败:", error);
                toast.error("保存失败");
              }
            }}
            onGenerateOutline={async (mode) => {
              try {
                if (mode === "full") {
                  // 完整生成模式：直接调用生成接口
                  setIsGenerateOutlineDialogOpen(true);
                } else {
                  // 续写模式：打开续写对话框
                  setIsContinueOutlineDialogOpen(true);
                }
              } catch (error) {
                console.error("生成大纲失败:", error);
                throw error;
              }
            }}
          />
        </TabsContent>

        <TabsContent value="characters">
          <CharacterManager
            projectId={projectId}
            initialCharacters={Array.isArray(project.characters) ? project.characters as never[] : []}
            outlines={outlines}
            onSave={async (characters) => {
              try {
                const response = await fetch(`/api/novel/projects/${projectId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ characters }),
                });
                if (response.ok) {
                  const updated = await response.json();
                  setProject(updated);
                }
              } catch (error) {
                throw new Error("保存失败");
              }
            }}
          />
        </TabsContent>

        <TabsContent value="world">
          <WorldSettingEditor
            projectId={projectId}
            initialData={project.world_setting as never}
            onSave={async (worldSetting) => {
              try {
                const response = await fetch(`/api/novel/projects/${projectId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ world_setting: worldSetting }),
                });
                if (response.ok) {
                  const updated = await response.json();
                  setProject(updated);
                }
              } catch (error) {
                throw new Error("保存失败");
              }
            }}
          />
        </TabsContent>

        <TabsContent value="settings">
          <ProjectSettings project={project} onUpdate={setProject} />
        </TabsContent>
      </Tabs>

      {/* AI 生成大纲对话框 */}
      <GenerateOutlineDialog
        isOpen={isGenerateOutlineDialogOpen}
        onClose={() => setIsGenerateOutlineDialogOpen(false)}
        projectId={projectId}
        onGenerated={(generatedOutlines) => {
          setOutlines(generatedOutlines);
          toast.success("大纲已生成并保存");
        }}
      />

      {/* 续写大纲对话框 */}
      <ContinueOutlineDialog
        isOpen={isContinueOutlineDialogOpen}
        onClose={() => setIsContinueOutlineDialogOpen(false)}
        projectId={projectId}
        existingOutlines={outlines}
        projectGenre={project?.genre}
        onGenerated={async (newChapters) => {
          // 追加到现有大纲后面
          const updatedOutlines = [...outlines, ...newChapters];
          setOutlines(updatedOutlines);

          // 自动保存
          const backendOutlines = updatedOutlines.map(denormalizeOutline);
          await fetch(`/api/novel/projects/${projectId}/outlines`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ outlines: backendOutlines }),
          });
        }}
      />
    </div>
  );
}
