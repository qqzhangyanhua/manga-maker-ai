"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Server, Cpu, Building2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingPlan {
  id: string;
  name: string;
  subtitle: string;
  price: string;
  priceUnit: string;
  description: string;
  features: string[];
  recommended?: boolean;
  ctaText: string;
  specs: {
    credits: string;
    storage: string;
    priority: string;
  };
}

const pricingPlans: PricingPlan[] = [
  {
    id: "hobbyist",
    name: "入门版",
    subtitle: "TIER_01",
    price: "$0",
    priceUnit: "/月",
    description: "体验访问。限速模式。",
    features: [
      "100 算力积分/月",
      "720p 最大分辨率",
      "标准队列优先级",
      "社区支持频道",
      "7天项目保留期",
    ],
    ctaText: "部署",
    specs: {
      credits: "100/月",
      storage: "1GB",
      priority: "标准",
    },
  },
  {
    id: "professional",
    name: "专业版",
    subtitle: "TIER_02",
    price: "$29",
    priceUnit: "/月",
    description: "生产就绪。完整管线。",
    features: [
      "2,000 算力积分/月",
      "4K 最大分辨率",
      "优先队列访问",
      "实体持久化已启用",
      "分层 PSD 导出",
      "API 访问 (1000 请求/天)",
      "30天项目保留期",
    ],
    recommended: true,
    ctaText: "升级",
    specs: {
      credits: "2K/月",
      storage: "50GB",
      priority: "高优先级",
    },
  },
  {
    id: "studio",
    name: "工作室版",
    subtitle: "TIER_03",
    price: "$199",
    priceUnit: "/月",
    description: "团队部署。专属资源。",
    features: [
      "无限算力积分",
      "8K 最大分辨率",
      "专属渲染节点",
      "自定义模型微调",
      "团队席位 (最多 10 人)",
      "API 访问 (无限制)",
      "Webhook 集成",
      "SLA 99.9% 正常运行时间",
    ],
    ctaText: "联系",
    specs: {
      credits: "无限",
      storage: "500GB",
      priority: "专属",
    },
  },
];

export function PricingSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [isHovering, setIsHovering] = useState(false);

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

  return (
    <section className="relative px-4 py-24 bg-[#0c0c0e]">
      {/* Top separator line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-mono uppercase tracking-widest text-zinc-500">
              算力方案
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            资源分配
          </h2>
          <p className="text-zinc-400 max-w-xl font-mono text-sm">
            选择算力层级。按需扩展。透明收费。
          </p>
        </div>

        {/* Pricing Grid with Spotlight */}
        <div
          ref={containerRef}
          className="relative"
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
                ? `radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(249, 115, 22, 0.07), transparent 40%)`
                : "none",
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-zinc-800">
            {pricingPlans.map((plan, index) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                isFirst={index === 0}
                isLast={index === pricingPlans.length - 1}
                mousePosition={mousePosition}
                isContainerHovering={isHovering}
              />
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center">
          <p className="text-xs font-mono text-zinc-600">
            包含: SSL加密 | CDN分发 | 自动备份 | GDPR合规
          </p>
        </div>
      </div>
    </section>
  );
}

interface PricingCardProps {
  plan: PricingPlan;
  isFirst: boolean;
  isLast: boolean;
  mousePosition: { x: number; y: number } | null;
  isContainerHovering: boolean;
}

function PricingCard({ plan, isFirst, isLast, mousePosition, isContainerHovering }: PricingCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [localMousePos, setLocalMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isCardHovered, setIsCardHovered] = useState(false);

  // Update local mouse position relative to this card
  const updateLocalMousePos = useCallback(() => {
    if (!mousePosition || !cardRef.current) {
      setLocalMousePos(null);
      return;
    }

    const rect = cardRef.current.getBoundingClientRect();
    const containerRect = cardRef.current.parentElement?.parentElement?.getBoundingClientRect();

    if (!containerRect) return;

    // Calculate mouse position relative to this card
    const cardLeft = rect.left - containerRect.left;
    const cardTop = rect.top - containerRect.top;

    setLocalMousePos({
      x: mousePosition.x - cardLeft,
      y: mousePosition.y - cardTop,
    });
  }, [mousePosition]);

  // Check if mouse is within proximity of this card
  const isNearCard = useCallback(() => {
    if (!mousePosition || !cardRef.current) return false;

    const rect = cardRef.current.getBoundingClientRect();
    const containerRect = cardRef.current.parentElement?.parentElement?.getBoundingClientRect();

    if (!containerRect) return false;

    const cardLeft = rect.left - containerRect.left;
    const cardTop = rect.top - containerRect.top;
    const cardCenterX = cardLeft + rect.width / 2;
    const cardCenterY = cardTop + rect.height / 2;

    const distance = Math.sqrt(
      Math.pow(mousePosition.x - cardCenterX, 2) +
      Math.pow(mousePosition.y - cardCenterY, 2)
    );

    return distance < 400;
  }, [mousePosition]);

  // Update local position when mouse moves
  useEffect(() => {
    updateLocalMousePos();
  }, [mousePosition, updateLocalMousePos]);

  const showGlow = isContainerHovering && (isCardHovered || isNearCard());

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative flex flex-col bg-zinc-900",
        !isLast && "md:border-r border-zinc-800",
        !isFirst && "border-t md:border-t-0 border-zinc-800",
        plan.recommended && "border-2 border-orange-500 md:border-2 md:-my-4 md:z-10"
      )}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      {/* Glowing border overlay - visible when mouse is near */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none z-20 transition-opacity duration-300",
          showGlow && !plan.recommended ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: localMousePos
            ? `radial-gradient(350px circle at ${localMousePos.x}px ${localMousePos.y}px, rgba(249, 115, 22, 0.5), transparent 40%)`
            : "none",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "xor",
          WebkitMaskComposite: "xor",
          padding: "1px",
        }}
      />

      {/* Inner glow effect - soft fill */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-300",
          showGlow ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: localMousePos
            ? `radial-gradient(400px circle at ${localMousePos.x}px ${localMousePos.y}px, rgba(249, 115, 22, 0.08), transparent 40%)`
            : "none",
        }}
      />
      {/* Recommended Tag */}
      {plan.recommended && (
        <div className="absolute -top-px left-0 right-0 flex justify-center">
          <div className="px-4 py-1.5 bg-orange-500 text-xs font-mono font-bold text-black tracking-wider">
            推荐配置
          </div>
        </div>
      )}

      {/* Card Content */}
      <div className={cn("relative z-10 flex flex-col h-full p-6", plan.recommended && "pt-10")}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            {plan.id === "hobbyist" && <Cpu className="w-5 h-5 text-zinc-500" />}
            {plan.id === "professional" && <Server className="w-5 h-5 text-orange-500" />}
            {plan.id === "studio" && <Building2 className="w-5 h-5 text-zinc-400" />}
            <span
              className={cn(
                "font-mono font-bold tracking-wider",
                plan.recommended ? "text-orange-500" : "text-white"
              )}
            >
              {plan.name}
            </span>
          </div>
          <div className="text-xs font-mono text-zinc-600">{plan.subtitle}</div>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "text-4xl font-bold font-mono",
                plan.recommended ? "text-orange-500" : "text-white"
              )}
            >
              {plan.price}
            </span>
            <span className="text-zinc-500 font-mono text-sm">{plan.priceUnit}</span>
          </div>
          <p className="text-sm text-zinc-500 mt-2 font-mono">{plan.description}</p>
        </div>

        {/* Specs Table */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-black/40 border border-zinc-800 mb-6">
          <div className="text-center">
            <div className="text-[10px] font-mono text-zinc-600">积分</div>
            <div
              className={cn(
                "text-sm font-mono font-bold",
                plan.recommended ? "text-orange-500" : "text-white"
              )}
            >
              {plan.specs.credits}
            </div>
          </div>
          <div className="text-center border-x border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-600">存储</div>
            <div
              className={cn(
                "text-sm font-mono font-bold",
                plan.recommended ? "text-orange-500" : "text-white"
              )}
            >
              {plan.specs.storage}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-mono text-zinc-600">队列</div>
            <div
              className={cn(
                "text-sm font-mono font-bold",
                plan.specs.priority === "高优先级" && "text-emerald-500",
                plan.specs.priority === "专属" && "text-amber-500",
                plan.specs.priority === "标准" && "text-zinc-400"
              )}
            >
              {plan.specs.priority}
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="flex-1 mb-6">
          <div className="space-y-2">
            {plan.features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span
                  className={cn(
                    "text-sm font-mono font-bold",
                    plan.recommended ? "text-orange-500" : "text-zinc-600"
                  )}
                >
                  +
                </span>
                <span className="text-sm text-zinc-400 font-mono">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button - Mechanical style */}
        <button
          className={cn(
            "relative w-full py-3 font-mono font-bold text-sm tracking-wider transition-all duration-100",
            "border-2 overflow-hidden",
            plan.recommended
              ? "bg-orange-500 border-orange-500 text-black hover:bg-orange-400"
              : "bg-transparent border-zinc-700 text-white hover:border-zinc-500 hover:bg-zinc-800",
            isPressed && "translate-y-0.5"
          )}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
        >
          {/* Button inner shadow for pressed effect */}
          <span
            className={cn(
              "absolute inset-0 transition-opacity",
              plan.recommended
                ? "bg-gradient-to-b from-black/0 to-black/20"
                : "bg-gradient-to-b from-white/0 to-white/5",
              isPressed ? "opacity-100" : "opacity-0"
            )}
          />
          <span className="relative flex items-center justify-center gap-2">
            {plan.ctaText}
            <ArrowRight className="w-4 h-4" />
          </span>
        </button>

        {/* Plan ID footer */}
        <div className="mt-4 text-center">
          <span className="text-[10px] font-mono text-zinc-700">
            方案ID: {plan.id.toUpperCase()}_v2.1
          </span>
        </div>
      </div>
    </div>
  );
}
