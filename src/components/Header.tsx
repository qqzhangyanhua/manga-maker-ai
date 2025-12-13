"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles, FolderOpen, FileText, LogOut, ShieldCheck, BookOpen, LayoutTemplate, ChevronDown, Palette, Workflow, BarChart3, Grid3X3, Images } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Header = () => {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

  const isAdmin = (currentUser?.role || "user") === "admin";

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        throw new Error("logout failed");
      }
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast({ title: "已退出登录" });
    } catch (error) {
      toast({ title: "退出失败", description: "请稍后再试", variant: "destructive" });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-comic text-2xl text-foreground">ComicAI</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-4">
          {/* 创作流程 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  ["/story", "/scripts", "/workflow", "/editor", "/storyboard"].some(p => pathname?.startsWith(p)) && "text-foreground"
                )}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                创作流程
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href="/story" className="flex items-center gap-2 cursor-pointer">
                  <Sparkles className="w-4 h-4" />
                  故事创作
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/scripts" className="flex items-center gap-2 cursor-pointer">
                  <BookOpen className="w-4 h-4" />
                  剧本管理
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/workflow" className="flex items-center gap-2 cursor-pointer">
                  <Workflow className="w-4 h-4" />
                  一键生成
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/editor" className="flex items-center gap-2 cursor-pointer">
                  <Palette className="w-4 h-4" />
                  画面精炼
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/storyboard" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  分镜编辑
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/projects" className="flex items-center gap-2 cursor-pointer">
                  <Grid3X3 className="w-4 h-4" />
                  分镜项目
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 资源管理 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  ["/templates", "/assets"].some(p => pathname?.startsWith(p)) && "text-foreground"
                )}
              >
                <FolderOpen className="w-4 h-4 mr-1" />
                资源
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href="/templates" className="flex items-center gap-2 cursor-pointer">
                  <LayoutTemplate className="w-4 h-4" />
                  模板市场
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/assets" className="flex items-center gap-2 cursor-pointer">
                  <FolderOpen className="w-4 h-4" />
                  资产库
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/generated" className="flex items-center gap-2 cursor-pointer">
                  <Images className="w-4 h-4" />
                  生成图库
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 管理后台 (仅管理员) */}
          {isAdmin && (
            <Link href="/admin">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  pathname?.startsWith("/admin") && "text-foreground"
                )}
              >
                <ShieldCheck className="w-4 h-4 mr-1" />
                管理后台
              </Button>
            </Link>
          )}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {currentUser ? (
            <>
              <span className="hidden sm:inline text-sm text-muted-foreground">
                你好，{currentUser.name || currentUser.email}
              </span>
              {isAdmin && (
                <Link href="/admin/usage" className="hidden lg:block">
                  <Button variant="outline" size="sm">
                    <BarChart3 className="w-4 h-4 mr-1" />
                    用量日志
                  </Button>
                </Link>
              )}
              <Link href="/storyboard" className="hidden sm:block">
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4" />
                  分镜
                </Button>
              </Link>
              <Link href="/storyboard">
                <Button variant="glow" size="sm">
                  开始创作
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout} disabled={loggingOut}>
                <LogOut className="w-4 h-4 mr-1" />
                {loggingOut ? "退出中" : "退出"}
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="outline" size="sm">
                  登录
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="glow" size="sm">
                  注册
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
