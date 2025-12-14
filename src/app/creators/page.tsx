"use client";

import Link from "next/link";
import {
  Sparkles,
  Zap,
  Palette,
  Clock,
  DollarSign,
  Users,
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  Layers,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Landing";

export default function CreatorsPage() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <Navbar />

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative px-4 py-24 overflow-hidden">
          {/* Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

          <div className="relative z-10 max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30 backdrop-blur-sm mb-6">
              <Users className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-mono text-orange-500">
                独立创作者
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="text-white">为</span>
              <span className="text-orange-500"> 独立漫画家 </span>
              <br />
              <span className="text-white">量身打造</span>
            </h1>

            <p className="text-xl text-zinc-400 max-w-3xl mx-auto mb-8 leading-relaxed">
              从构思到成品，一站式创作平台。<br />
              AI 处理重复劳动，你专注于故事本身。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white border-0 px-8"
                asChild
              >
                <Link href="/story">
                  <Sparkles className="w-5 h-5 mr-2" />
                  开始创作
                </Link>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-500 px-8"
                asChild
              >
                <Link href="#features">
                  查看功能
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "创作时间", value: "节省 70%" },
                { label: "作品产出", value: "提升 3x" },
                { label: "起步成本", value: "$0" },
                { label: "独立创作者", value: "12K+" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold font-mono text-orange-500">
                    {stat.value}
                  </div>
                  <div className="text-sm text-zinc-500 font-mono">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pain Points Section */}
        <section className="px-4 py-16 bg-zinc-900/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                独立创作的挑战
              </h2>
              <p className="text-zinc-400 font-mono text-sm">
                我们理解你面临的困境
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Clock,
                  title: "时间成本高",
                  description: "手绘一页漫画需要 4-8 小时，完整章节耗时数周",
                  color: "text-red-500"
                },
                {
                  icon: DollarSign,
                  title: "资金门槛高",
                  description: "雇佣助手、购买软件、租用工作室费用不菲",
                  color: "text-amber-500"
                },
                {
                  icon: Palette,
                  title: "技术要求高",
                  description: "需要掌握分镜、透视、上色等多项专业技能",
                  color: "text-blue-500"
                },
              ].map((pain) => (
                <div
                  key={pain.title}
                  className="p-6 border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors"
                >
                  <pain.icon className={`w-8 h-8 ${pain.color} mb-4`} />
                  <h3 className="text-white font-semibold text-lg mb-2">{pain.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {pain.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="px-4 py-24 bg-[#09090b]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 mb-4">
                <Zap className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-mono text-orange-500 uppercase tracking-wider">
                  核心功能
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                专为独立创作者优化
              </h2>
              <p className="text-zinc-400 max-w-2xl mx-auto">
                强大的 AI 工具集，让你像大型工作室一样高效创作
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Feature 1 */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-8 hover:border-orange-500/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                    <Fingerprint className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      角色一致性保证
                    </h3>
                    <p className="text-zinc-400 mb-4 leading-relaxed">
                      创建一次角色，在所有分镜中保持 99%+ 相似度。无需反复调整，告别"画崩"困扰。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        ID 锁定
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        多视角
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        表情库
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-8 hover:border-orange-500/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      智能分镜布局
                    </h3>
                    <p className="text-zinc-400 mb-4 leading-relaxed">
                      输入剧本，AI 自动规划分镜。支持多种构图风格，一键调整节奏和张力。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        自动分镜
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        镜头语言
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        动态调整
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-8 hover:border-orange-500/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      分层导出编辑
                    </h3>
                    <p className="text-zinc-400 mb-4 leading-relaxed">
                      导出 PSD 分层文件，在 Photoshop 中精修细节。保留完整图层结构，灵活调整。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        PSD 导出
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        图层分离
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        二次编辑
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-8 hover:border-orange-500/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      快速迭代试错
                    </h3>
                    <p className="text-zinc-400 mb-4 leading-relaxed">
                      2 分钟生成完整分镜预览，快速验证创意。不满意立即重来，0 试错成本。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        2 分钟预览
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        无限迭代
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        版本对比
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section className="px-4 py-24 bg-zinc-900/50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                三步完成创作
              </h2>
              <p className="text-zinc-400 font-mono text-sm">
                从灵感到成品，只需几分钟
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "创建角色库",
                  description: "上传参考图或描述外观，AI 生成三视图、表情库、多套服装。建立你的专属角色库。",
                  icon: Fingerprint
                },
                {
                  step: "02",
                  title: "输入故事剧本",
                  description: "写下你的故事大纲或完整剧本，AI 自动分析场景、对话、情绪，生成最佳分镜方案。",
                  icon: LayoutGrid
                },
                {
                  step: "03",
                  title: "生成并导出",
                  description: "一键生成所有分镜画面，实时预览效果。满意后导出高分辨率 PNG 或 PSD 分层文件。",
                  icon: Layers
                },
              ].map((item, index) => (
                <div key={item.step} className="relative">
                  {/* Connection Line */}
                  {index < 2 && (
                    <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-zinc-800 -z-10">
                      <div className="absolute right-0 w-3 h-3 border-b-2 border-r-2 border-orange-500 rotate-45 -translate-y-1" />
                    </div>
                  )}

                  <div className="border border-zinc-800 bg-[#09090b] p-6 h-full">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-5xl font-bold font-mono text-zinc-800">
                        {item.step}
                      </div>
                      <div className="p-2 bg-orange-500/10 text-orange-500">
                        <item.icon className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">
                      {item.title}
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonial Section */}
        <section className="px-4 py-24 bg-[#09090b]">
          <div className="max-w-4xl mx-auto">
            <div className="border border-zinc-800 bg-zinc-900/40 p-8 md:p-12">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-black">张</span>
                </div>
                <div>
                  <div className="text-white font-semibold text-lg">张小鱼</div>
                  <div className="text-zinc-500 text-sm font-mono">独立漫画家 · 《都市异闻录》作者</div>
                </div>
              </div>

              <blockquote className="text-zinc-300 text-lg leading-relaxed mb-6">
                "以前画一话 20 页的漫画需要整整 2 周，现在用 ComicAI 只要 2 天就能完成分镜和草稿。
                我终于可以把时间花在打磨剧情和细节上，而不是重复劳动。作为独立创作者，这个工具简直是救星。"
              </blockquote>

              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>已发布 3 部连载作品</span>
                </div>
                <div className="w-px h-4 bg-zinc-700" />
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>累计 120+ 页漫画</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-24 bg-zinc-900/50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              开始你的创作之旅
            </h2>
            <p className="text-zinc-400 mb-8 max-w-2xl mx-auto">
              加入 12,000+ 独立创作者，用 AI 释放你的创意潜能。<br />
              从今天开始，把想法变成作品。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white border-0 px-8"
                asChild
              >
                <Link href="/story">
                  <Sparkles className="w-5 h-5 mr-2" />
                  免费开始创作
                </Link>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-500 px-8"
                asChild
              >
                <Link href="/#pricing">
                  查看价格方案
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>

            <p className="text-xs text-zinc-600 mt-6 font-mono">
              无需信用卡 · 100 算力积分免费使用 · 随时取消
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
