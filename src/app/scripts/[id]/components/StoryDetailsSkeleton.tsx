/**
 * 剧本详情页骨架屏组件
 * 在数据加载时提供占位符,提升用户感知性能
 */

"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Navbar } from "@/components/Landing";

export function StoryDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <Navbar />

      <main className="pt-16">
        {/* 装饰性光晕 */}
        <div className="fixed top-20 left-1/4 w-96 h-96 bg-orange-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-purple-500/3 blur-3xl rounded-full pointer-events-none" />

        <div className="relative px-4 py-12">
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header 骨架 */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-md bg-zinc-800" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-8 w-64 bg-zinc-800" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20 rounded-full bg-zinc-800" />
                  <Skeleton className="h-4 w-48 bg-zinc-800" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* 左侧:故事信息面板骨架 */}
              <div className="lg:col-span-1 space-y-6">
                {/* 剧本信息卡片 */}
                <Card className="border-zinc-700 bg-zinc-900/60 backdrop-blur-md">
                  <CardHeader>
                    <Skeleton className="h-6 w-24 bg-zinc-800" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-12 bg-zinc-800" />
                      <Skeleton className="h-8 w-full bg-zinc-800" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24 bg-zinc-800" />
                      <Skeleton className="h-32 w-full bg-zinc-800" />
                    </div>
                    <Skeleton className="h-10 w-full bg-zinc-800" />
                  </CardContent>
                </Card>

                {/* 角色列表卡片 */}
                <Card className="border-zinc-700 bg-zinc-900/60 backdrop-blur-md">
                  <CardHeader>
                    <Skeleton className="h-6 w-20 bg-zinc-800" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-3 bg-zinc-800/50 rounded-lg space-y-2">
                        <Skeleton className="h-5 w-24 bg-zinc-700" />
                        <Skeleton className="h-4 w-full bg-zinc-700" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* 右侧:分镜列表骨架 */}
              <div className="lg:col-span-3 space-y-6">
                {/* 标题栏 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded bg-zinc-800" />
                    <Skeleton className="h-6 w-32 bg-zinc-800" />
                  </div>
                  <Skeleton className="h-10 w-24 bg-zinc-800" />
                </div>

                {/* 分镜卡片列表 */}
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="border-zinc-700 bg-zinc-900/60 backdrop-blur-md animate-pulse">
                      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-6 w-16 rounded-full bg-zinc-800" />
                          <Skeleton className="h-6 w-24 rounded-full bg-zinc-800" />
                          <Skeleton className="h-6 w-24 rounded-full bg-zinc-800" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded bg-zinc-800" />
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Skeleton className="h-3 w-16 bg-zinc-800" />
                            <Skeleton className="h-4 w-full bg-zinc-800" />
                            <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-3 w-12 bg-zinc-800" />
                            <Skeleton className="h-4 w-full bg-zinc-800" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}