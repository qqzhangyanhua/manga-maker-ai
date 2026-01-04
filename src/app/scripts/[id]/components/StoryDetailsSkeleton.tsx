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

        <div className="relative px-4 py-8">
          <div className="max-w-6xl mx-auto relative">
            {/* 顶部标题区域骨架 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1 space-y-3">
                {/* 标题和统计 */}
                <div className="flex items-center gap-4">
                  <Skeleton className="h-8 w-64 bg-zinc-800" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-32 bg-zinc-800" />
                  <Skeleton className="h-5 w-32 bg-zinc-800" />
                  <Skeleton className="h-5 w-32 bg-zinc-800" />
                </div>
              </div>
            </div>

            {/* Tab 导航骨架 */}
            <div className="mb-6">
              <div className="border-b border-gray-800">
                <div className="flex items-center gap-4 pb-3">
                  <Skeleton className="h-10 w-24 bg-zinc-800" />
                  <Skeleton className="h-10 w-24 bg-zinc-800" />
                  <Skeleton className="h-10 w-24 bg-zinc-800" />
                </div>
              </div>
            </div>

            {/* 章节列表骨架 */}
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="border-zinc-700 bg-zinc-900/60 backdrop-blur-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-32 bg-zinc-800" />
                        <Skeleton className="h-5 w-20 rounded-full bg-zinc-800" />
                      </div>
                      <Skeleton className="h-9 w-24 bg-zinc-800" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* 分镜卡片骨架 */}
                    {[1, 2].map((j) => (
                      <div key={j} className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
                        <div className="flex items-start gap-4">
                          {/* 左侧图片 */}
                          <Skeleton className="w-32 h-32 rounded bg-zinc-700 flex-shrink-0" />

                          {/* 右侧内容 */}
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-5 w-16 rounded-full bg-zinc-700" />
                              <Skeleton className="h-4 w-24 bg-zinc-700" />
                            </div>
                            <Skeleton className="h-4 w-full bg-zinc-700" />
                            <Skeleton className="h-4 w-4/5 bg-zinc-700" />
                            <div className="flex items-center gap-2 pt-2">
                              <Skeleton className="h-8 w-20 bg-zinc-700" />
                              <Skeleton className="h-8 w-20 bg-zinc-700" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}