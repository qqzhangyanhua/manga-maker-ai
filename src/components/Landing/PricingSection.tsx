"use client";

import { useState } from "react";
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
    name: "HOBBYIST",
    subtitle: "TIER_01",
    price: "$0",
    priceUnit: "/mo",
    description: "Evaluation access. Rate-limited.",
    features: [
      "100 compute credits/month",
      "720p max resolution",
      "Standard queue priority",
      "Community support channel",
      "7-day project retention",
    ],
    ctaText: "DEPLOY",
    specs: {
      credits: "100/mo",
      storage: "1GB",
      priority: "STD",
    },
  },
  {
    id: "professional",
    name: "PROFESSIONAL",
    subtitle: "TIER_02",
    price: "$29",
    priceUnit: "/mo",
    description: "Production-ready. Full pipeline access.",
    features: [
      "2,000 compute credits/month",
      "4K max resolution",
      "Priority queue access",
      "Entity Persistence enabled",
      "Layered PSD export",
      "API access (1000 req/day)",
      "30-day project retention",
    ],
    recommended: true,
    ctaText: "UPGRADE",
    specs: {
      credits: "2K/mo",
      storage: "50GB",
      priority: "HIGH",
    },
  },
  {
    id: "studio",
    name: "STUDIO",
    subtitle: "TIER_03",
    price: "$199",
    priceUnit: "/mo",
    description: "Team deployment. Dedicated resources.",
    features: [
      "Unlimited compute credits",
      "8K max resolution",
      "Dedicated render nodes",
      "Custom model fine-tuning",
      "Team seats (up to 10)",
      "API access (unlimited)",
      "Webhook integrations",
      "SLA 99.9% uptime",
    ],
    ctaText: "CONTACT",
    specs: {
      credits: "UNLIM",
      storage: "500GB",
      priority: "DEDICATED",
    },
  },
];

export function PricingSection() {
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
              Compute Plans
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Resource Allocation
          </h2>
          <p className="text-zinc-400 max-w-xl font-mono text-sm">
            Select compute tier. Scale on demand. No hidden fees.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-zinc-800">
          {pricingPlans.map((plan, index) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isFirst={index === 0}
              isLast={index === pricingPlans.length - 1}
            />
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center">
          <p className="text-xs font-mono text-zinc-600">
            INCLUDED: SSL_ENCRYPTION | CDN_DELIVERY | AUTO_BACKUP | GDPR_COMPLIANT
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
}

function PricingCard({ plan, isFirst, isLast }: PricingCardProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <div
      className={cn(
        "relative flex flex-col bg-zinc-900",
        !isLast && "md:border-r border-zinc-800",
        !isFirst && "border-t md:border-t-0 border-zinc-800",
        plan.recommended && "border-2 border-orange-500 md:border-2 md:-my-4 md:z-10"
      )}
    >
      {/* Recommended Tag */}
      {plan.recommended && (
        <div className="absolute -top-px left-0 right-0 flex justify-center">
          <div className="px-4 py-1.5 bg-orange-500 text-xs font-mono font-bold text-black tracking-wider">
            RECOMMENDED CONFIG
          </div>
        </div>
      )}

      {/* Card Content */}
      <div className={cn("flex flex-col h-full p-6", plan.recommended && "pt-10")}>
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
            <div className="text-[10px] font-mono text-zinc-600">CREDITS</div>
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
            <div className="text-[10px] font-mono text-zinc-600">STORAGE</div>
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
            <div className="text-[10px] font-mono text-zinc-600">QUEUE</div>
            <div
              className={cn(
                "text-sm font-mono font-bold",
                plan.specs.priority === "HIGH" && "text-emerald-500",
                plan.specs.priority === "DEDICATED" && "text-amber-500",
                plan.specs.priority === "STD" && "text-zinc-400"
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
            PLAN_ID: {plan.id.toUpperCase()}_v2.1
          </span>
        </div>
      </div>
    </div>
  );
}
