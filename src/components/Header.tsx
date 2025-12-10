"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sparkles, FolderOpen, FileText, LogOut, ShieldCheck, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";

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
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/story"
            className={cn(
              "text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1",
              pathname === "/story" && "text-foreground"
            )}
          >
            <Sparkles className="w-4 h-4" />
            故事创作
          </Link>
          <Link
            href="/scripts"
            className={cn(
              "text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1",
              pathname && pathname.startsWith("/scripts") && "text-foreground"
            )}
          >
            <BookOpen className="w-4 h-4" />
            剧本管理
          </Link>
          <Link
            href="/workflow"
            className={cn(
              "text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1",
              pathname === "/workflow" && "text-foreground"
            )}
          >
            <FileText className="w-4 h-4" />
            一键生成
          </Link>
          <Link
            href="/storyboard"
            className={cn(
              "text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1",
              pathname === "/storyboard" && "text-foreground"
            )}
          >
            <FileText className="w-4 h-4" />
            分镜编辑
          </Link>
          <Link
            href="/assets"
            className={cn(
              "text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1",
              pathname === "/assets" && "text-foreground"
            )}
          >
            <FolderOpen className="w-4 h-4" />
            资产库
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1",
                pathname?.startsWith("/admin") && "text-foreground"
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              管理后台
            </Link>
          )}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <>
              <span className="hidden sm:inline text-sm text-muted-foreground">
                你好，{currentUser.name || currentUser.email}
              </span>
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
