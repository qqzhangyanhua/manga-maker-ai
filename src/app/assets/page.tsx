"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Landing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Box, MapPin, ArrowLeft } from "lucide-react";
import CharacterLibrary from "@/components/AssetLibrary/CharacterLibrary";
import SceneLibrary from "@/components/AssetLibrary/SceneLibrary";
import PoseLabEditor from "@/components/PoseLab/PoseLabEditor";
import { useUsage } from "@/hooks/use-usage";
import { cn } from "@/lib/utils";

const AssetLibraryPage = () => {
  const [activeTab, setActiveTab] = useState("characters");
  const { usage, loading: usageLoading } = useUsage();

  // Spotlight effect state
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse tracking for spotlight effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setMousePosition(null);
  }, []);

  const renderUsageBadge = (
    label: string,
    item?: { remaining: number | null; limit: number | null; count: number }
  ) => {
    const remaining = item?.remaining ?? null;
    const limit = item?.limit ?? null;
    const isLow = typeof remaining === "number" && remaining <= 3;
    const isExhausted = typeof remaining === "number" && remaining <= 0;
    const badgeClass = isExhausted
      ? "border-red-500/70 bg-red-500/10 text-red-400"
      : isLow
      ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-400"
      : "border-zinc-700 bg-zinc-900/60";

    return (
      <div className={`rounded-lg border px-3 py-2 text-sm ${badgeClass} backdrop-blur-md`}>
        <div className="text-xs text-zinc-400">{label}</div>
        <div className="font-medium text-white">
          {usageLoading
            ? "加载中..."
            : limit
            ? `剩余 ${remaining ?? "-"} / ${limit}`
            : "无限制"}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1410' }}>
      <Navbar />
      <main className="pt-16">
        {/* 装饰性光晕 */}
        <div className="fixed top-20 left-1/4 w-96 h-96 bg-orange-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-purple-500/3 blur-3xl rounded-full pointer-events-none" />

        <div
          ref={containerRef}
          className="relative px-4 py-12"
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Global Spotlight Overlay */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-30 transition-opacity duration-500",
              isHovering ? "opacity-100" : "opacity-0"
            )}
            style={{
              background: mousePosition
                ? `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(249, 115, 22, 0.08), transparent 40%)`
                : "none",
            }}
          />

          <div className="max-w-7xl mx-auto relative">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-orange-500 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              返回首页
            </Link>

            <div className="flex flex-wrap gap-3 mb-6 items-center">
              <div className="text-sm text-zinc-400">今日用量</div>
              {renderUsageBadge("分镜生成", usage?.storyboard_generation)}
              {renderUsageBadge("图像生成", usage?.image_generation)}
              {renderUsageBadge("聊天/LLM", usage?.llm_chat)}
            </div>

            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent mb-4">
                资产管理系统
              </h1>
              <p className="text-zinc-300 text-lg max-w-2xl mx-auto">
                管理你的角色、姿势和场景资产，保持创作的一致性
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full max-w-md mx-auto grid grid-cols-3 mb-8 h-auto p-1 bg-zinc-900/60 backdrop-blur-md border border-zinc-700">
              <TabsTrigger
                value="characters"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-orange-500 data-[state=active]:text-black text-zinc-400"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">角色</span>
              </TabsTrigger>
              <TabsTrigger
                value="poses"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-orange-500 data-[state=active]:text-black text-zinc-400"
              >
                <Box className="w-4 h-4" />
                <span className="hidden sm:inline">姿势</span>
              </TabsTrigger>
              <TabsTrigger
                value="scenes"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-orange-500 data-[state=active]:text-black text-zinc-400"
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">场景</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="characters" className="mt-0">
              <CharacterLibrary />
            </TabsContent>

              <TabsContent value="poses" className="mt-0">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-2xl text-white">3D 姿态辅助库</h2>
                      <p className="text-zinc-300">
                        使用 3D 人偶编辑器摆出精确的姿势，解决 AI 难以绘制的透视和动态问题
                      </p>
                    </div>
                  </div>
                  <div className="min-h-[600px]">
                    <PoseLabEditor />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="scenes" className="mt-0">
                <SceneLibrary />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AssetLibraryPage;
