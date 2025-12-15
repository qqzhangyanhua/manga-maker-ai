"use client";

import Link from "next/link";
import {
  Sparkles,
  BookOpen,
  Scale,
  Lock,
  TrendingUp,
  Shield,
  ArrowRight,
  CheckCircle2,
  Database,
  FileCheck,
  Rocket,
  Zap,
  Building2,
  BarChart3,
  Globe,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Landing";

export default function PublishersPage() {
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
              <BookOpen className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-mono text-orange-500">
                漫画出版商
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="text-white">为</span>
              <span className="text-orange-500"> 出版平台 </span>
              <br />
              <span className="text-white">提供内容引擎</span>
            </h1>

            <p className="text-xl text-zinc-400 max-w-3xl mx-auto mb-8 leading-relaxed">
              规模化内容生产，标准化质量管控。<br />
              从独立作者到平台 IP，全链路数字化管理。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white border-0 px-8"
                asChild
              >
                <Link href="/story">
                  <Sparkles className="w-5 h-5 mr-2" />
                  申请企业方案
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
                { label: "内容产能", value: "提升 10x" },
                { label: "质量合格率", value: "99.5%" },
                { label: "平均交付时间", value: "72 小时" },
                { label: "合作平台", value: "50+" },
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
                出版平台的挑战
              </h2>
              <p className="text-zinc-400 font-mono text-sm">
                内容规模与质量控制的矛盾
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: TrendingUp,
                  title: "内容供应不足",
                  description: "优质作者稀缺，内容产出速度跟不上平台增长需求",
                  color: "text-red-500"
                },
                {
                  icon: FileCheck,
                  title: "质量参差不齐",
                  description: "UGC 内容质量难以保证，审核成本高，用户流失率高",
                  color: "text-amber-500"
                },
                {
                  icon: Scale,
                  title: "版权管理复杂",
                  description: "多作者协作，版权归属不清晰，法律风险高",
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
                  企业级功能
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                完整的内容管理平台
              </h2>
              <p className="text-zinc-400 max-w-2xl mx-auto">
                从内容生产到版权管理，一站式解决方案
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Feature 1 */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-8 hover:border-orange-500/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                    <Rocket className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      大规模内容生产
                    </h3>
                    <p className="text-zinc-400 mb-4 leading-relaxed">
                      单日处理 1000+ 分镜，月产 10,000+ 页漫画。专属集群保证稳定性，满足平台级流量需求。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        无限并发
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        专属集群
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        弹性扩展
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-8 hover:border-orange-500/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      智能质量审核
                    </h3>
                    <p className="text-zinc-400 mb-4 leading-relaxed">
                      AI 自动检测内容合规性、画面质量、叙事连贯性。人工审核工作量降低 80%，效率大幅提升。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        内容审核
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        质量评分
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        自动标记
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-8 hover:border-orange-500/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                    <Scale className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      版权归属管理
                    </h3>
                    <p className="text-zinc-400 mb-4 leading-relaxed">
                      区块链存证，记录每个作品的创作者、编辑者、审核者。版权清晰可溯，规避法律风险。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        区块链存证
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        权益分配
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        合同管理
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-8 hover:border-orange-500/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                    <Database className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      私有化部署选项
                    </h3>
                    <p className="text-zinc-400 mb-4 leading-relaxed">
                      支持本地或私有云部署，数据完全掌控。符合等保三级要求，满足政企客户安全标准。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        私有部署
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        等保三级
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        数据隔离
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-8 hover:border-orange-500/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      多语言国际化
                    </h3>
                    <p className="text-zinc-400 mb-4 leading-relaxed">
                      支持 20+ 语言生成，一键翻译对话框。同一作品轻松发行到全球市场，降低本地化成本。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        20+ 语言
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        自动翻译
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        区域适配
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 6 */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-8 hover:border-orange-500/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      数据分析驾驶舱
                    </h3>
                    <p className="text-zinc-400 mb-4 leading-relaxed">
                      实时追踪生产效率、内容质量、用户反馈。BI 报表深度洞察，辅助运营决策。
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        实时监控
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        BI 报表
                      </span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono">
                        数据导出
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Integration Section */}
        <section className="px-4 py-24 bg-zinc-900/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                无缝集成现有系统
              </h2>
              <p className="text-zinc-400 font-mono text-sm">
                API 优先设计，适配任何业务流程
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Database,
                  title: "内容管理系统",
                  description: "对接 CMS，自动同步稿件状态"
                },
                {
                  icon: FileCheck,
                  title: "审核工作流",
                  description: "集成审核流程，自动推送待审内容"
                },
                {
                  icon: BarChart3,
                  title: "数据分析平台",
                  description: "导出至 BI 系统，生成运营报表"
                },
                {
                  icon: Lock,
                  title: "支付结算系统",
                  description: "对接财务系统，自动结算创作者收益"
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="border border-zinc-800 bg-zinc-900/40 p-6 hover:border-orange-500/50 transition-colors"
                >
                  <item.icon className="w-8 h-8 text-orange-500 mb-4" />
                  <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                  <p className="text-zinc-400 text-sm">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 border border-zinc-800 bg-zinc-900/40 p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-500/10 text-orange-500 flex-shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    企业级 SLA 保障
                  </h3>
                  <p className="text-zinc-400 mb-4 leading-relaxed">
                    99.9% 可用性承诺，专属客户经理 7x24 响应。提供技术对接、定制开发、专项培训等全方位支持。
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-zinc-400 text-sm">99.9% 可用性</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-zinc-400 text-sm">7x24 技术支持</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-zinc-400 text-sm">专属客户经理</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-zinc-400 text-sm">定制化开发</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Case Study Section */}
        <section className="px-4 py-24 bg-[#0f0f13]">
          <div className="max-w-4xl mx-auto">
            <div className="border border-zinc-800 bg-zinc-900/40 p-8 md:p-12">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-8 h-8 text-black" />
                </div>
                <div>
                  <div className="text-white font-semibold text-lg">飞天漫画平台</div>
                  <div className="text-zinc-500 text-sm font-mono">月活 500 万+ · 签约作者 2000+</div>
                </div>
              </div>

              <blockquote className="text-zinc-300 text-lg leading-relaxed mb-6">
                "接入 ComicAI 后，我们平台的内容供给能力提升了 10 倍。过去依赖人工创作，月更新量只有 5000 页，
                现在通过 AI 辅助生产，月更新量达到 50,000 页。用户留存率提升 40%，广告收入翻了 2 倍。
                最重要的是，我们建立了完整的 AI 内容审核体系，人工审核成本降低 70%。"
              </blockquote>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-zinc-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>内容产能 10 倍提升</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>审核成本降低 70%</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>用户留存率 +40%</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>广告收入翻 2 倍</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Deployment Options */}
        <section className="px-4 py-24 bg-zinc-900/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                灵活的部署方案
              </h2>
              <p className="text-zinc-400 font-mono text-sm">
                根据业务需求选择合适的部署模式
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: "公有云",
                  subtitle: "开箱即用",
                  icon: Globe,
                  features: [
                    "快速接入，无需部署",
                    "按需付费，灵活扩容",
                    "自动升级，免运维",
                    "适合快速验证 POC"
                  ],
                  cta: "立即开通"
                },
                {
                  name: "私有云",
                  subtitle: "数据自主",
                  icon: Shield,
                  features: [
                    "部署到客户私有云",
                    "数据完全自主可控",
                    "符合等保三级标准",
                    "适合大型企业客户"
                  ],
                  cta: "申请部署",
                  recommended: true
                },
                {
                  name: "本地化",
                  subtitle: "高度定制",
                  icon: Lock,
                  features: [
                    "客户本地机房部署",
                    "完全离线运行",
                    "定制化功能开发",
                    "适合政企特殊需求"
                  ],
                  cta: "咨询方案"
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
                      企业首选
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-500/10 text-orange-500">
                      <plan.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      <div className="text-zinc-500 text-xs font-mono">{plan.subtitle}</div>
                    </div>
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
                    <Link href="/story">{plan.cta}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-24 bg-[#0f0f13]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              携手共建内容生态
            </h2>
            <p className="text-zinc-400 mb-8 max-w-2xl mx-auto">
              加入 50+ 漫画平台，用 AI 驱动内容规模化。<br />
              预约演示，了解如何提升平台竞争力。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white border-0 px-8"
                asChild
              >
                <Link href="/story">
                  <Sparkles className="w-5 h-5 mr-2" />
                  预约产品演示
                </Link>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-500 px-8"
                asChild
              >
                <Link href="/#pricing">
                  下载企业方案书
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>

            <p className="text-xs text-zinc-600 mt-6 font-mono">
              提供 POC 验证 · 专属技术团队 · 定制化开发支持
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
