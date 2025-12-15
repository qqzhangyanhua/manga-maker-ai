"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Sparkles, Layers } from "lucide-react";
import { Navbar } from "@/components/Landing";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSamples } from "./hooks/useSamples";
import { SampleCard } from "./components/SampleCard";
import { SamplePreviewDialog } from "./components/SamplePreviewDialog";
import type { SampleProject } from "./types";
import { CATEGORY_LABELS } from "./types";

export default function SamplesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { samples, loading, error, copySample, copying } = useSamples();
  const [previewSample, setPreviewSample] = useState<SampleProject | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // 按分类分组
  const groupedSamples = samples.reduce<Record<string, SampleProject[]>>(
    (acc, sample) => {
      const category = sample.category || "beginner";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(sample);
      return acc;
    },
    {}
  );

  const handlePreview = (id: string) => {
    const sample = samples.find((s) => s.id === id);
    if (sample) {
      setPreviewSample(sample);
      setShowPreview(true);
    }
  };

  const handleCopy = async (id: string) => {
    const result = await copySample(id);
    if (result.success && result.storyId) {
      toast({
        title: "复制成功",
        description: "示例项目已复制到你的账号，正在跳转...",
      });
      router.push(`/scripts/${result.storyId}`);
    } else {
      toast({
        title: "复制失败",
        description: result.error || "请确认已登录后重试",
        variant: "destructive",
      });
    }
  };

  const categoryOrder = ["beginner", "intermediate", "advanced"];

  return (
    <div className="min-h-screen bg-[#09090b]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-zinc-400 hover:text-white inline-flex items-center gap-2 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                <BookOpen className="w-8 h-8 text-orange-500" />
                示例项目
              </h1>
              <p className="text-zinc-400 mt-1">
                浏览优质示例，一键复制到你的账号开始学习和修改
              </p>
            </div>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white border-0" asChild>
              <Link href="/story">
                <Sparkles className="w-4 h-4 mr-2" />
                从零开始创作
              </Link>
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto" />
              <p className="text-zinc-400">加载示例项目中...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <p className="text-red-400">{error}</p>
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600" onClick={() => window.location.reload()}>
                重试
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && samples.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <Layers className="w-16 h-16 text-zinc-700 mx-auto" />
              <p className="text-zinc-400">暂无示例项目</p>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white border-0" asChild>
                <Link href="/story">
                  <Sparkles className="w-4 h-4 mr-2" />
                  开始创作你的第一个作品
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Samples Grid by Category */}
        {!loading && !error && samples.length > 0 && (
          <div className="space-y-12">
            {categoryOrder.map((category) => {
              const categorySamples = groupedSamples[category];
              if (!categorySamples || categorySamples.length === 0) return null;

              return (
                <section key={category}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-semibold text-white">
                      {CATEGORY_LABELS[category] || category}
                    </h2>
                    <span className="text-sm text-zinc-500">
                      {categorySamples.length} 个示例
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categorySamples.map((sample) => (
                      <SampleCard
                        key={sample.id}
                        sample={sample}
                        onCopy={handleCopy}
                        onPreview={handlePreview}
                        copying={copying === sample.id}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Tips Section */}
        <div className="mt-16 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="font-semibold text-white mb-3">使用提示</h3>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="text-orange-500">1.</span>
              <span>
                <strong className="text-zinc-300">入门示例</strong> 适合初次使用的用户，通常只有 4 格，结构简单
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">2.</span>
              <span>
                <strong className="text-zinc-300">进阶示例</strong> 包含更多分镜和情节转折，适合学习叙事技巧
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">3.</span>
              <span>
                <strong className="text-zinc-300">高级示例</strong> 展示复杂的故事结构和多样的画面类型
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">4.</span>
              <span>
                点击「复制到我的」后，示例将保存到你的账号，你可以自由修改和重新生成
              </span>
            </li>
          </ul>
        </div>
      </main>

      {/* Preview Dialog */}
      <SamplePreviewDialog
        sample={previewSample}
        open={showPreview}
        onOpenChange={setShowPreview}
        onCopy={handleCopy}
        copying={copying === previewSample?.id}
      />
    </div>
  );
}
