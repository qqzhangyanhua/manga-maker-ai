"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
} from "lucide-react";
import { Navbar } from "@/components/Landing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EditProfileDialog } from "./components/EditProfileDialog";
import { ChangePasswordDialog } from "./components/ChangePasswordDialog";
import { TransactionsDialog } from "./components/TransactionsDialog";
import { RechargeDialog } from "./components/RechargeDialog";
import type { UserInfo } from "./types";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);

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

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch("/api/auth/me");
      const result = await response.json();

      if (result.success) {
        setUser(result.data.user);
      } else {
        // Not logged in, redirect to home
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to fetch user info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f13]">
        <Navbar />
        <main className="pt-16 px-4 py-12">
          <div className="max-w-6xl mx-auto">
            <Skeleton className="h-12 w-48 mb-8 bg-zinc-800" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-64 bg-zinc-800" />
              <Skeleton className="h-64 bg-zinc-800" />
              <Skeleton className="h-64 bg-zinc-800" />
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
      return <Badge className="bg-orange-500 text-white">管理员</Badge>;
    }
    return <Badge variant="outline">用户</Badge>;
  };

  const getStatusBadge = (status: string | null) => {
    if (status === "active") {
      return <Badge className="bg-emerald-500 text-white">正常</Badge>;
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
    <div className="min-h-screen bg-[#0f0f13]">
      <Navbar />

      <main className="pt-16">
        {/* 装饰性光晕 */}
        <div className="fixed top-20 left-1/4 w-96 h-96 bg-orange-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-purple-500/3 blur-3xl rounded-full pointer-events-none" />

        <div
          ref={containerRef}
          className="relative px-4 py-12"
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
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-orange-500 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              返回首页
            </Link>

            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent mb-4">
                个人中心
              </h1>
              <p className="text-zinc-300 text-lg">管理您的账户信息和偏好设置</p>
            </div>
            {/* User Profile Card */}
            <Card className="relative border-zinc-700 bg-zinc-900/60 backdrop-blur-md mb-6 overflow-hidden shadow-lg">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
              <CardContent className="pt-6 relative z-10">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  {/* Avatar */}
                  <Avatar className="w-24 h-24 border-2 border-orange-500">
                <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-500 text-black text-2xl font-bold">
                  {getUserInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-white">
                    {user.name || "未设置昵称"}
                  </h2>
                  {getRoleBadge(user.role)}
                  {getStatusBadge(user.status)}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                    {user.verified && (
                      <Badge variant="outline" className="text-xs">
                        已验证
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Calendar className="w-4 h-4" />
                    <span>注册于 {formattedDate}</span>
                  </div>
                </div>
              </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                      onClick={() => setEditProfileOpen(true)}
                    >
                      <SettingsIcon className="w-4 h-4" />
                      编辑资料
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-950/20"
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-zinc-900/60 backdrop-blur-md border border-zinc-700">
                <TabsTrigger value="overview" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">总览</TabsTrigger>
                <TabsTrigger value="credits" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">算力管理</TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">账户设置</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Credits Card */}
                  <Card className="relative border-zinc-700 bg-zinc-900/60 backdrop-blur-md overflow-hidden shadow-lg">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
                    <CardHeader className="relative z-10">
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Zap className="w-5 h-5 text-orange-500" />
                        算力余额
                      </CardTitle>
                      <CardDescription className="text-zinc-400">当前可用算力</CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-3xl font-bold text-emerald-500 mb-4">
                        {user.credits.toLocaleString()}
                      </div>
                      <Button
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg shadow-orange-500/20"
                        onClick={() => setRechargeOpen(true)}
                      >
                        <CreditCard className="w-4 h-4" />
                        充值算力
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Usage Card */}
                  <Card className="relative border-zinc-700 bg-zinc-900/60 backdrop-blur-md overflow-hidden shadow-lg">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
                    <CardHeader className="relative z-10">
                      <CardTitle className="flex items-center gap-2 text-white">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        累计消耗
                      </CardTitle>
                      <CardDescription className="text-zinc-400">总算力使用量</CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-3xl font-bold text-blue-500 mb-4">
                        {user.total_credits_used.toLocaleString()}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                        onClick={() => setTransactionsOpen(true)}
                      >
                        <History className="w-4 h-4" />
                        查看明细
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Account Status Card */}
                  <Card className="relative border-zinc-700 bg-zinc-900/60 backdrop-blur-md overflow-hidden shadow-lg">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
                    <CardHeader className="relative z-10">
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Shield className="w-5 h-5 text-purple-500" />
                        账户状态
                      </CardTitle>
                      <CardDescription className="text-zinc-400">权限与安全</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">角色</span>
                        {getRoleBadge(user.role)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">状态</span>
                        {getStatusBadge(user.status)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">邮箱</span>
                        {user.verified ? (
                          <Badge variant="outline" className="text-emerald-500">
                            已验证
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-500">
                            未验证
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Links */}
                <Card className="relative border-zinc-700 bg-zinc-900/60 backdrop-blur-md overflow-hidden shadow-lg">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
                  <CardHeader className="relative z-10">
                    <CardTitle className="text-white">快速入口</CardTitle>
                    <CardDescription className="text-zinc-400">常用功能</CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                        onClick={() => router.push("/scripts")}
                      >
                        <User className="w-5 h-5 text-orange-500" />
                        <span className="text-sm">剧本记录</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                        onClick={() => router.push("/projects")}
                      >
                        <User className="w-5 h-5 text-blue-500" />
                        <span className="text-sm">分镜项目</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                        onClick={() => router.push("/generated")}
                      >
                        <User className="w-5 h-5 text-purple-500" />
                        <span className="text-sm">生成图库</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                        onClick={() => router.push("/assets")}
                      >
                        <User className="w-5 h-5 text-emerald-500" />
                        <span className="text-sm">资产库</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Credits Tab */}
              <TabsContent value="credits" className="space-y-6">
                <Card className="relative border-zinc-700 bg-zinc-900/60 backdrop-blur-md overflow-hidden shadow-lg">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
                  <CardHeader className="relative z-10">
                    <CardTitle className="text-white">算力管理</CardTitle>
                    <CardDescription className="text-zinc-400">查看和管理您的算力</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 relative z-10">
                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                      <div>
                        <div className="text-sm text-zinc-400 mb-1">当前余额</div>
                        <div className="text-2xl font-bold text-emerald-500">
                          {user.credits.toLocaleString()} 算力
                        </div>
                      </div>
                      <Button
                        className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20"
                        onClick={() => setRechargeOpen(true)}
                      >
                        充值
                      </Button>
                    </div>

                    <Separator className="bg-zinc-700" />

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">使用统计</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded">
                          <span className="text-sm text-zinc-400">累计消耗</span>
                          <span className="font-mono font-semibold text-white">
                            {user.total_credits_used.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded">
                          <span className="text-sm text-zinc-400">剩余算力</span>
                          <span className="font-mono font-semibold text-emerald-500">
                            {user.credits.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                      onClick={() => setTransactionsOpen(true)}
                    >
                      <History className="w-4 h-4" />
                      查看交易记录
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <Card className="relative border-zinc-700 bg-zinc-900/60 backdrop-blur-md overflow-hidden shadow-lg">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
                  <CardHeader className="relative z-10">
                    <CardTitle className="text-white">账户设置</CardTitle>
                    <CardDescription className="text-zinc-400">管理您的账户信息和偏好设置</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 relative z-10">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-white">基本信息</h3>
                      <div className="p-4 bg-zinc-800/30 rounded space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-400">用户名</span>
                          <span className="text-sm text-white">
                            {user.name || "未设置"}
                          </span>
                        </div>
                        <Separator className="bg-zinc-700" />
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-400">邮箱</span>
                          <span className="text-sm text-white">{user.email}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                        onClick={() => setEditProfileOpen(true)}
                      >
                        <SettingsIcon className="w-4 h-4" />
                        编辑基本信息
                      </Button>
                    </div>

                    <Separator className="bg-zinc-700" />

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-white">安全设置</h3>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                          onClick={() => setChangePasswordOpen(true)}
                        >
                          <Shield className="w-4 h-4" />
                          修改密码
                        </Button>
                        <Button variant="outline" className="w-full justify-start gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50">
                          <Mail className="w-4 h-4" />
                          更换邮箱
                        </Button>
                      </div>
                    </div>

                    <Separator className="bg-zinc-700" />

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-red-400">危险操作</h3>
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2 border-red-500/30 bg-red-950/20 text-red-400 hover:text-red-300 hover:bg-red-950/30 hover:border-red-500/50"
                      >
                        <LogOut className="w-4 h-4" />
                        注销账户
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
            onSuccess={(updatedUser) => {
              setUser(updatedUser);
              fetchUserInfo();
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
          />
        </>
      )}
    </div>
  );
}
