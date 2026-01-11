"use client";

import { PricingSection } from "@/components/Landing";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:text-orange-500 transition-colors text-zinc-400">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回首页</span>
          </Link>
          <h1 className="text-sm font-semibold text-white tracking-wide">Manga Maker AI <span className="text-zinc-600 mx-2">|</span> 算力方案</h1>
          <div className="w-24" /> {/* Spacer */}
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-16">
        {/* 装饰性光晕 */}
        <div className="fixed top-20 left-1/4 w-96 h-96 bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <PricingSection />
        </div>
      </main>
    </div>
  );
};

export default PricingPage;
