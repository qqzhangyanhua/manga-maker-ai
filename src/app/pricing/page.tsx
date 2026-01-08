"use client";

import { PricingSection } from "@/components/Landing";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PricingPage = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1410' }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/95 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
            <span className="text-sm text-zinc-400">返回首页</span>
          </Link>
          <h1 className="text-lg font-bold text-white">算力方案</h1>
          <div className="w-24" />
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        <PricingSection />
      </main>
    </div>
  );
};

export default PricingPage;
