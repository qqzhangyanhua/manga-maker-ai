import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AssetsHeaderProps {
  children?: React.ReactNode;
}

export function AssetsHeader({ children }: AssetsHeaderProps) {
  return (
    <div className="space-y-6 mb-8">
      {/* 顶部导航与标题 */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-orange-500 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回首页
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            资产管理系统
            <span className="text-orange-500">.</span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">
            管理您的数字资产库，包括角色、场景和姿势。打造一致性的"数字演员"和"场景记忆"，提升漫画创作效率。
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          {children}
        </div>
      </div>
    </div>
  );
}
