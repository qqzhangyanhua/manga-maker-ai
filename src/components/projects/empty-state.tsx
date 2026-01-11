import Link from "next/link";
import { Grid3X3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

export function ProjectEmptyState() {
  return (
    <GlassCard className="relative text-center py-20 px-6 overflow-hidden max-w-lg mx-auto mt-10">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
      
      <div className="relative flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-900 flex items-center justify-center ring-1 ring-white/10 shadow-xl mb-6 group">
          <Grid3X3 className="w-10 h-10 text-zinc-600 group-hover:text-orange-500 transition-colors duration-500" />
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">暂无分镜项目</h3>
        <p className="text-zinc-400 mb-8 max-w-sm leading-relaxed">
          您的创意工坊空空如也。立即创建一个新项目，开始您的漫画创作之旅吧！
        </p>
        
        <Link href="/storyboard">
          <Button size="lg" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-lg shadow-orange-500/20 px-8">
            <Sparkles className="w-4 h-4 mr-2" />
            开始创作
          </Button>
        </Link>
      </div>
      
      {/* 背景装饰 */}
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-orange-500/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />
    </GlassCard>
  );
}
