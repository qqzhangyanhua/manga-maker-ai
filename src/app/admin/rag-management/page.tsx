"use client";

import { useState } from "react";
import { Database, BarChart3, Settings, Search, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useCurrentUser } from "@/hooks/use-current-user";

const RAGManagementPage = () => {
  const { data: currentUser, isLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("overview");

  const isAdmin = currentUser?.role === "admin";

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">RAG 向量数据库管理</h1>
        <p>正在加载...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">RAG 向量数据库管理</h1>
        <p>需要管理员权限</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen halftone-pattern">
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        {/* 页面头部 */}
        <div className="relative">
          <div className="absolute right-0 top-0 z-20">
            <ThemeToggle />
          </div>
          <div className="absolute -left-4 -top-4 w-20 h-20 bg-purple-400 rounded-full blur-3xl opacity-20 animate-pulse" />
          <h1 className="text-5xl font-bold mb-4 flex items-center gap-3 comic-title relative z-10">
            <Database className="w-12 h-12 text-purple-500 drop-shadow-md" />
            RAG 向量数据库管理
          </h1>
          <p className="text-xl text-muted-foreground font-medium pl-2 border-l-4 border-purple-500/50">
            智能检索引擎的指挥中心，管理所有章节的语义索引
          </p>
        </div>

        {/* Tab 导航 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="comic-card border-2 border-zinc-900 dark:border-zinc-600 p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-purple-500 data-[state=active]:text-white flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              系统概览
            </TabsTrigger>
            <TabsTrigger
              value="index"
              className="data-[state=active]:bg-purple-500 data-[state=active]:text-white flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              索引管理
            </TabsTrigger>
            <TabsTrigger
              value="quality"
              className="data-[state=active]:bg-purple-500 data-[state=active]:text-white flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              质量监控
            </TabsTrigger>
            <TabsTrigger
              value="maintenance"
              className="data-[state=active]:bg-purple-500 data-[state=active]:text-white flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              运维工具
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="comic-card border-2 border-zinc-900 dark:border-zinc-600 p-6">
              <p>系统概览 Tab（待实现）</p>
            </div>
          </TabsContent>

          <TabsContent value="index">
            <div className="comic-card border-2 border-zinc-900 dark:border-zinc-600 p-6">
              <p>索引管理 Tab（待实现）</p>
            </div>
          </TabsContent>

          <TabsContent value="quality">
            <div className="comic-card border-2 border-zinc-900 dark:border-zinc-600 p-6">
              <p>质量监控 Tab（待实现）</p>
            </div>
          </TabsContent>

          <TabsContent value="maintenance">
            <div className="comic-card border-2 border-zinc-900 dark:border-zinc-600 p-6">
              <p>运维工具 Tab（待实现）</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RAGManagementPage;
