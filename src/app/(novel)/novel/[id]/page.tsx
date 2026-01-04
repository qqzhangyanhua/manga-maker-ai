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
import { toast } from "sonner";

interface ChapterOutline {
  chapterNumber: number;
  title: string;
  outline: string;
  keyEvents: string[];
  characters: string[];
  plotLines: string[];
  isKeyChapter: boolean;
}

interface NovelProject {
  id: string;
  title: string;
  description: string | null;
  genre: string | null;
  status: string;
  total_words: number;
  chapter_count: number;
  world_setting: Record<string, unknown> | null;
  characters: unknown[] | null;
  outlines: ChapterOutline[] | null;
}

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  outline: string | null;
  content: string | null;
  word_count: number;
  status: string;
}

export default function NovelProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<NovelProject | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [outlines, setOutlines] = useState<ChapterOutline[]>([]);
  const [isGenerateOutlineDialogOpen, setIsGenerateOutlineDialogOpen] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchChapters();
    fetchOutlines();
  }, [projectId]);

  async function fetchProject() {
    try {
      const response = await fetch(`/api/novel/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
        // 同时加载大纲数据
        if (data.outlines) {
          setOutlines(data.outlines);
        }
      }
    } catch (error) {
      console.error("获取项目失败:", error);
      toast.error("获取项目失败");
    }
  }

  async function fetchOutlines() {
    try {
      const response = await fetch(`/api/novel/projects/${projectId}/outlines`);
      if (response.ok) {
        const data = await response.json();
        setOutlines(data.outlines || []);
      }
    } catch (error) {
      console.error("获取大纲失败:", error);
    }
  }

  async function fetchChapters() {
    try {
      setLoading(true);
      const response = await fetch(`/api/novel/chapters/project/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setChapters(data);
      }
    } catch (error) {
      console.error("获取章节列表失败:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateChapter() {
    const newChapterNumber = chapters.length + 1;
    
    try {
      const response = await fetch("/api/novel/chapters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          chapter_number: newChapterNumber,
          title: `第 ${newChapterNumber} 章`,
          outline: "",
        }),
      });

      if (response.ok) {
        const newChapter = await response.json();
        setChapters([...chapters, newChapter]);
        setSelectedChapter(newChapter);
        toast.success("章节创建成功");
      } else {
        throw new Error("创建失败");
      }
    } catch (error) {
      console.error("创建章节失败:", error);
      toast.error("创建章节失败");
    }
  }

  function handleChapterSelect(chapter: Chapter) {
    setSelectedChapter(chapter);
  }

  function handleChapterUpdate(updatedChapter: Chapter) {
    setChapters(
      chapters.map((ch) =>
        ch.id === updatedChapter.id ? updatedChapter : ch
      )
    );
    setSelectedChapter(updatedChapter);
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

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
                // 查找对应章节
                const chapter = chapters.find((ch) => ch.id === chapterId);
                if (chapter) {
                  setSelectedChapter(chapter);
                  toast.success(`已跳转到第 ${chapter.chapter_number} 章`);
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
                    chapters={chapters}
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
                const response = await fetch(`/api/novel/projects/${projectId}/outlines`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ outlines: newOutlines }),
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
            onGenerateOutline={async () => {
              setIsGenerateOutlineDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="characters">
          <CharacterManager
            projectId={projectId}
            initialCharacters={Array.isArray(project.characters) ? project.characters as never[] : []}
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
    </div>
  );
}
