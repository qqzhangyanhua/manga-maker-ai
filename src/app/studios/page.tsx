"use client";

import Link from "next/link";
import {
  Sparkles,
  Users,
  GitBranch,
  Clock,
  TrendingUp,
  Shield,
  ArrowRight,
  CheckCircle2,
  Workflow,
  Layers,
  Database,
  Zap,
  Building2,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Landing";

export default function StudiosPage() {
  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <Navbar />

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative px-4 py-24 overflow-hidden">
          {/* Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

          <div className="relative z-10 max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30 backdrop-blur-sm mb-6">
              <Building2 className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-mono text-orange-500">
                制作团队
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="text-white">为</span>
              <span className="text-orange-500"> 漫画工作室 </span>
              <br />
              <span className="text-white">打造协作引擎</span>
            </h1>

            <p className="text-xl text-zinc-400 max-w-3xl mx-auto mb-8 leading-relaxed">
              团队并行创作，统一质量标准。<br />
              从 5 人小组到 50 人团队，都能高效运转。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white border-0 px-8"
                asChild
              >
                <Link href="/story">
                  <Sparkles className="w-5 h-5 mr-2" />
                  申请试用
                </Link>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-500 px-8"
                asChild
              >
                <Link href="/#pricing">
                  查看价格
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "团队效率", value: "提升 5x" },
                { label: "制作成本", value: "降低 60%" },
                { label: "并行项目", value: "最多 50" },
                { label: "合作工作室", value: "800+" },
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
                工作室面临的困境
              </h2>
              <p className="text-zinc-400 font-mono text-sm">
                人力成本与质量控制的双重压力
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Users,
                  title: "协作效率低",
                  description: "多人同时创作，风格不统一，反复修改浪费时间",
                  color: "text-red-500"
                },
                {
                  icon: Clock,
                  title: "项目周期长",
                  description: "单个项目耗时数月，无法同时推进多个项目",
                  color: "text-amber-500"
                },
                {
                  icon: TrendingUp,
                  title: "扩张成本高",
                  description: "招聘培训新人成本高，难以快速扩大团队规模",
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
        <section id="features" className="px-4 py-24 bg-[#0f0f13]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 mb-4">
                <Zap className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-mono text-orange-500 uppercase tracking-wider">
                  团队功能
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                专业级协作平台
              </h2>
              <p className="text-zinc-400 max-w-2xl mx-auto">
                从资产管理到版本控制，满足工作室所有需求
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Feature 1 */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-8 hover:border-orange-500/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                    <Database className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      共享资产库
                    </h3>
                    <p className="text-zinc-400 mb-4 leading-relaxed">
                      团队共享角色、场景、道具素材。统一管理，权限分级，确保资产安全和版本一致性。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        云端存储
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        权限管理
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        版本控制
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-8 hover:border-orange-500/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                    <GitBranch className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      分支协作流程
                    </h3>
                    <p className="text-zinc-400 mb-4 leading-relaxed">
                      多人并行编辑不同章节，实时同步进度。分镜师、上色师、特效师无缝衔接。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        并行创作
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        实时同步
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        冲突解决
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-8 hover:border-orange-500/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      风格标准锁定
                    </h3>
                    <p className="text-zinc-400 mb-4 leading-relaxed">
                      定义团队风格模板，所有成员生成的画面自动遵循。新人也能快速产出符合标准的作品。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        风格模板
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        质量检查
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        审批流程
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-8 hover:border-orange-500/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      项目进度追踪
                    </h3>
                    <p className="text-zinc-400 mb-4 leading-relaxed">
                      实时看板显示每个项目状态。算力消耗、成员负载、交付时间一目了然，精准管理。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        可视化看板
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        成本统计
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        性能分析
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-8 hover:border-orange-500/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                    <Workflow className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      批量生成管线
                    </h3>
                    <p className="text-zinc-400 mb-4 leading-relaxed">
                      一次性提交 100+ 分镜任务，自动排队并行处理。专属渲染节点保证速度和稳定性。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        批量提交
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        优先队列
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        专属节点
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 6 */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-8 hover:border-orange-500/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      API 接口集成
                    </h3>
                    <p className="text-zinc-400 mb-4 leading-relaxed">
                      无限制 API 调用，集成到工作室现有流程。自动化脚本批量处理，无需人工操作。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        REST API
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        Webhook
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        SDK 支持
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team Seats Section */}
        <section className="px-4 py-24 bg-zinc-900/50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                灵活的团队配置
              </h2>
              <p className="text-zinc-400 font-mono text-sm">
                根据团队规模选择席位数量
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: "小型工作室",
                  seats: "3-5 人",
                  price: "$99",
                  features: [
                    "5,000 算力积分/月",
                    "50GB 共享存储",
                    "优先队列访问",
                    "基础协作功能",
                    "邮件技术支持"
                  ]
                },
                {
                  name: "中型工作室",
                  seats: "10-20 人",
                  price: "$299",
                  features: [
                    "20,000 算力积分/月",
                    "200GB 共享存储",
                    "专属渲染节点",
                    "完整协作功能",
                    "API 集成支持",
                    "优先技术支持"
                  ],
                  recommended: true
                },
                {
                  name: "大型工作室",
                  seats: "50+ 人",
                  price: "定制",
                  features: [
                    "无限算力积分",
                    "1TB+ 共享存储",
                    "独立部署选项",
                    "企业级 SLA",
                    "专属客户经理",
                    "定制化开发"
                  ]
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`border p-6 ${
                    plan.recommended
                      ? "border-orange-500 bg-zinc-900/80"
                      : "border-zinc-800 bg-zinc-900/40"
                  }`}
                >
                  {plan.recommended && (
                    <div className="inline-block px-3 py-1 bg-orange-500 text-black text-xs font-mono font-bold mb-4">
                      热门选择
                    </div>
                  )}

                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="text-zinc-500 text-sm font-mono mb-4">{plan.seats}</div>

                  <div className="mb-6">
                    <span className="text-3xl font-bold text-orange-500 font-mono">
                      {plan.price}
                    </span>
                    {plan.price !== "定制" && (
                      <span className="text-zinc-500 font-mono text-sm">/月</span>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <span className="text-zinc-400 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className={`w-full ${
                      plan.recommended
                        ? "bg-orange-500 hover:bg-orange-600 text-black"
                        : "bg-zinc-800 hover:bg-zinc-700 text-white"
                    }`}
                    asChild
                  >
                    <Link href="/story">
                      {plan.price === "定制" ? "联系我们" : "开始试用"}
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Case Study Section */}
        <section className="px-4 py-24 bg-[#0f0f13]">
          <div className="max-w-4xl mx-auto">
            <div className="border border-zinc-800 bg-zinc-900/40 p-8 md:p-12">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-8 h-8 text-black" />
                </div>
                <div>
                  <div className="text-white font-semibold text-lg">星辰动漫工作室</div>
                  <div className="text-zinc-500 text-sm font-mono">12 人团队 · 月产 200+ 页漫画</div>
                </div>
              </div>

              <blockquote className="text-zinc-300 text-lg leading-relaxed mb-6">
                "接入 ComicAI 后，我们的制作效率提升了 5 倍。以前需要 3 个月完成的项目，
                现在只要 3 周。团队成员可以并行处理 8 个项目，质量标准也完全统一。
                最重要的是，我们终于能够接更多商业订单，营收翻了 3 倍。"
              </blockquote>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-zinc-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>月产量 50 页 → 200 页</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>制作周期 3 月 → 3 周</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>并行项目 2 个 → 8 个</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>营收增长 3 倍</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-24 bg-zinc-900/50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              让你的工作室效率翻倍
            </h2>
            <p className="text-zinc-400 mb-8 max-w-2xl mx-auto">
              加入 800+ 漫画工作室，用 AI 驱动团队协作。<br />
              14 天免费试用，不满意随时取消。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white border-0 px-8"
                asChild
              >
                <Link href="/story">
                  <Sparkles className="w-5 h-5 mr-2" />
                  申请企业试用
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
              14 天免费试用 · 包含所有团队功能 · 专属客户经理
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
