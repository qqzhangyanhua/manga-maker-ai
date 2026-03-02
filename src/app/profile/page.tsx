"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Calendar,
  Zap,
  TrendingUp,
  Shield,
  Settings as SettingsIcon,
  CreditCard,
  History,
  LogOut,
  ArrowLeft,
  FileCode,
  FolderOpen,
  Image,
  Palette,
} from "lucide-react";
import { Navbar } from "@/components/Landing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/ui/glass-card";
import { EditProfileDialog } from "./components/EditProfileDialog";
import { ChangePasswordDialog } from "./components/ChangePasswordDialog";
import { TransactionsDialog } from "./components/TransactionsDialog";
import { RechargeDialog } from "./components/RechargeDialog";
import { ApiKeySettings } from "./components/ApiKeySettings";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const router = useRouter();
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const { toast } = useToast();

  // Use React Query hook for user data
  const { data: user, isLoading, error, refetch } = useCurrentUser();

  // Spotlight effect state
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse tracking for spotlight effect
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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleDeleteAccount = async () => {
    const firstConfirm = window.confirm(
      "确定要注销账户吗？此操作将永久删除您的所有数据，无法恢复。"
    );
    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      "请再次确认：注销后所有作品、角色、生成记录将被永久删除。"
    );
    if (!secondConfirm) return;

    setDeleteAccountLoading(true);
    try {
      const res = await fetch("/api/auth/delete-account", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "注销失败",
          description: data.error || "请稍后再试",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "账户已注销" });
      router.push("/");
    } catch (error) {
      toast({
        title: "注销失败",
        description: error instanceof Error ? error.message : "网络异常，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  // Redirect to home if not logged in
  if (error) {
    router.push("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
        <Navbar />
        <main className="pt-24 px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto space-y-8">
            <Skeleton className="h-12 w-48 bg-zinc-800" />
            <Skeleton className="h-[200px] w-full bg-zinc-800 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-64 bg-zinc-800 rounded-xl" />
              <Skeleton className="h-64 bg-zinc-800 rounded-xl" />
              <Skeleton className="h-64 bg-zinc-800 rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const formattedDate = new Date(user.created_at).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getRoleBadge = (role: string | null) => {
    if (role === "admin") {
      return <Badge className="bg-orange-500 text-white border-0 shadow-lg shadow-orange-500/20">管理员</Badge>;
    }
    return <Badge variant="outline" className="border-zinc-700 text-zinc-400">用户</Badge>;
  };

  const getStatusBadge = (status: string | null) => {
    if (status === "active") {
      return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border">正常</Badge>;
    }
    if (status === "suspended") {
      return <Badge variant="destructive">已停用</Badge>;
    }
    return <Badge variant="secondary">未知</Badge>;
  };

  const getUserInitials = (name: string | null, email: string) => {
    if (name) {
      return name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
      <Navbar />

      <main className="pt-24 pb-16">
        {/* 装饰性光晕 */}
        <div className="fixed top-20 left-1/4 w-96 h-96 bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div
          ref={containerRef}
          className="relative px-4 sm:px-6 lg:px-8"
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
                ? `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(249, 115, 22, 0.08), transparent 40%)`
                : "none",
            }}
          />

          <div className="max-w-6xl mx-auto relative space-y-8">
            <div className="flex flex-col gap-6">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-orange-500 transition-colors w-fit"
              >
                <ArrowLeft className="w-4 h-4" />
                返回首页
              </Link>

              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent mb-4 tracking-tight">
                  个人中心
                </h1>
                <p className="text-zinc-400 text-lg">管理您的账户信息和偏好设置</p>
              </div>
            </div>

            {/* User Profile Card */}
            <GlassCard className="relative p-8 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
              <div className="flex flex-col md:flex-row items-start md:items-center gap-8 relative z-10">
                {/* Avatar */}
                <Avatar className="w-24 h-24 border-4 border-zinc-900 ring-2 ring-orange-500/50 shadow-2xl">
                  <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-500 text-white text-2xl font-bold">
                    {getUserInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      {user.name || "未设置昵称"}
                    </h2>
                    {getRoleBadge(user.role)}
                    {getStatusBadge(user.status)}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                      {user.verified && (
                        <span className="text-emerald-500 text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">已验证</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Calendar className="w-4 h-4" />
                      <span>注册于 {formattedDate}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 w-full md:w-auto">
                  <Button
                    variant="outline"
                    className="flex-1 md:flex-none gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                    onClick={() => setEditProfileOpen(true)}
                  >
                    <SettingsIcon className="w-4 h-4" />
                    编辑资料
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="flex-1 md:flex-none gap-2 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                  >
                    <LogOut className="w-4 h-4" />
                    退出
                  </Button>
                </div>
              </div>
            </GlassCard>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-8">
              <TabsList className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-1 rounded-xl">
                <TabsTrigger 
                  value="overview" 
                  className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all"
                >
                  总览
                </TabsTrigger>
                <TabsTrigger 
                  value="credits" 
                  className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all"
                >
                  算力管理
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all"
                >
                  账户设置
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Credits Card */}
                  <GlassCard className="p-6 flex flex-col justify-between hover:shadow-orange-500/10 transition-shadow">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-white font-medium">
                        <Zap className="w-5 h-5 text-orange-500" />
                        算力余额
                      </div>
                      <div className="text-4xl font-bold text-white tracking-tight">
                        {user.credits.toLocaleString()}
                      </div>
                      <p className="text-sm text-zinc-500">当前可用算力</p>
                    </div>
                    <Button
                      className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg shadow-orange-500/20"
                      onClick={() => setRechargeOpen(true)}
                    >
                      <CreditCard className="w-4 h-4" />
                      充值算力
                    </Button>
                  </GlassCard>

                  {/* Usage Card */}
                  <GlassCard className="p-6 flex flex-col justify-between hover:shadow-blue-500/10 transition-shadow">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-white font-medium">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        累计消耗
                      </div>
                      <div className="text-4xl font-bold text-blue-400 tracking-tight">
                        {user.total_credits_used.toLocaleString()}
                      </div>
                      <p className="text-sm text-zinc-500">历史总消耗量</p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-6 gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      onClick={() => setTransactionsOpen(true)}
                    >
                      <History className="w-4 h-4" />
                      查看明细
                    </Button>
                  </GlassCard>

                  {/* Account Status Card */}
                  <GlassCard className="p-6 flex flex-col justify-between hover:shadow-purple-500/10 transition-shadow">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-white font-medium">
                        <Shield className="w-5 h-5 text-purple-500" />
                        账户状态
                      </div>
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-lg">
                          <span className="text-sm text-zinc-400">角色权限</span>
                          {getRoleBadge(user.role)}
                        </div>
                        <div className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-lg">
                          <span className="text-sm text-zinc-400">账户状态</span>
                          {getStatusBadge(user.status)}
                        </div>
                        <div className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-lg">
                          <span className="text-sm text-zinc-400">邮箱验证</span>
                          {user.verified ? (
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 已验证
                            </span>
                          ) : (
                            <span className="text-xs text-amber-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> 未验证
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {/* Quick Links */}
                <GlassCard className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">快速入口</h3>
                    <p className="text-sm text-zinc-500">常用功能快捷访问</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: FileCode, color: "text-orange-500", label: "作品记录", href: "/scripts" },
                      { icon: FolderOpen, color: "text-blue-500", label: "分镜项目", href: "/projects" },
                      { icon: Image, color: "text-purple-500", label: "生成图库", href: "/generated" },
                      { icon: Palette, color: "text-emerald-500", label: "资产库", href: "/assets" },
                    ].map((item, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        className="h-auto py-6 flex-col gap-3 border-zinc-800 bg-zinc-900/30 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-all group"
                        onClick={() => router.push(item.href)}
                      >
                        <div className={`p-3 rounded-full bg-zinc-900 group-hover:bg-zinc-800 transition-colors`}>
                          <item.icon className={`w-6 h-6 ${item.color}`} />
                        </div>
                        <span className="text-sm font-medium">{item.label}</span>
                      </Button>
                    ))}
                  </div>
                </GlassCard>
              </TabsContent>

              {/* Credits Tab */}
              <TabsContent value="credits" className="space-y-6 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                <GlassCard className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-semibold text-white">算力管理</h3>
                      <p className="text-sm text-zinc-400">查看和管理您的算力资源</p>
                    </div>
                    <Button
                      className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20"
                      onClick={() => setRechargeOpen(true)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      立即充值
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Zap className="w-24 h-24 text-orange-500" />
                       </div>
                       <p className="text-zinc-400 text-sm mb-2">当前余额</p>
                       <p className="text-4xl font-bold text-white tracking-tight">{user.credits.toLocaleString()} <span className="text-lg text-zinc-500 font-normal">算力</span></p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                         <TrendingUp className="w-24 h-24 text-blue-500" />
                       </div>
                       <p className="text-zinc-400 text-sm mb-2">累计消耗</p>
                       <p className="text-4xl font-bold text-white tracking-tight">{user.total_credits_used.toLocaleString()} <span className="text-lg text-zinc-500 font-normal">算力</span></p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full py-6 border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    onClick={() => setTransactionsOpen(true)}
                  >
                    <History className="w-4 h-4 mr-2" />
                    查看详细交易记录
                  </Button>
                </GlassCard>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                <GlassCard className="p-8">
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-white">账户设置</h3>
                    <p className="text-sm text-zinc-400">管理您的账户安全与偏好</p>
                  </div>

                  <div className="space-y-8">
                    <section className="space-y-4">
                      <h4 className="text-sm font-medium text-white uppercase tracking-wider opacity-70">基本信息</h4>
                      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
                        <div className="p-4 flex items-center justify-between border-b border-zinc-800">
                          <div>
                            <p className="text-sm text-zinc-400">用户名</p>
                            <p className="text-white font-medium">{user.name || "未设置"}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setEditProfileOpen(true)}>编辑</Button>
                        </div>
                        <div className="p-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-zinc-400">邮箱地址</p>
                            <p className="text-white font-medium">{user.email}</p>
                          </div>
                          <Badge variant="outline" className="text-zinc-500 border-zinc-700">不可修改</Badge>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h4 className="text-sm font-medium text-white uppercase tracking-wider opacity-70">安全</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Button
                          variant="outline"
                          className="justify-start h-12 border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600"
                          onClick={() => setChangePasswordOpen(true)}
                        >
                          <Shield className="w-4 h-4 mr-3" />
                          修改登录密码
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start h-12 border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600"
                          onClick={() =>
                            toast({
                              title: "功能开发中",
                              description: "绑定新邮箱功能即将上线，敬请期待",
                            })
                          }
                        >
                          <Mail className="w-4 h-4 mr-3" />
                          绑定新邮箱
                        </Button>
                      </div>
                    </section>

                    <ApiKeySettings />

                    <section className="space-y-4">
                      <h4 className="text-sm font-medium text-red-400 uppercase tracking-wider opacity-70">危险区域</h4>
                      <div className="p-4 rounded-xl border border-red-900/30 bg-red-950/10 flex items-center justify-between">
                        <div>
                           <p className="text-white font-medium">注销账户</p>
                           <p className="text-sm text-zinc-500">删除账户及其所有关联数据，此操作无法撤销。</p>
                        </div>
                        <Button
                          variant="destructive"
                          className="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800/50"
                          onClick={handleDeleteAccount}
                          disabled={deleteAccountLoading}
                        >
                          {deleteAccountLoading ? "处理中..." : "注销账户"}
                        </Button>
                      </div>
                    </section>
                  </div>
                </GlassCard>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Dialogs */}
      {user && (
        <>
          <EditProfileDialog
            open={editProfileOpen}
            onOpenChange={setEditProfileOpen}
            user={user}
            onSuccess={() => {
              refetch();
            }}
          />
          <ChangePasswordDialog
            open={changePasswordOpen}
            onOpenChange={setChangePasswordOpen}
          />
          <TransactionsDialog
            open={transactionsOpen}
            onOpenChange={setTransactionsOpen}
          />
          <RechargeDialog
            open={rechargeOpen}
            onOpenChange={setRechargeOpen}
            onSuccess={refetch}
          />
        </>
      )}
    </div>
  );
}
