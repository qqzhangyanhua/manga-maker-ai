"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
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

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);

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
      <div className="min-h-screen bg-[#0f0f13] pt-20 px-4">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
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
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#0f0f13]/95 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">个人中心</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="text-zinc-400 hover:text-white"
            >
              返回首页
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* User Profile Card */}
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardContent className="pt-6">
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
                  className="gap-2"
                  onClick={() => setEditProfileOpen(true)}
                >
                  <SettingsIcon className="w-4 h-4" />
                  编辑资料
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2 text-red-400 hover:text-red-300"
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
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="overview">总览</TabsTrigger>
            <TabsTrigger value="credits">算力管理</TabsTrigger>
            <TabsTrigger value="settings">账户设置</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Credits Card */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Zap className="w-5 h-5 text-orange-500" />
                    算力余额
                  </CardTitle>
                  <CardDescription>当前可用算力</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-500 mb-4">
                    {user.credits.toLocaleString()}
                  </div>
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2"
                    onClick={() => setRechargeOpen(true)}
                  >
                    <CreditCard className="w-4 h-4" />
                    充值算力
                  </Button>
                </CardContent>
              </Card>

              {/* Usage Card */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    累计消耗
                  </CardTitle>
                  <CardDescription>总算力使用量</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-500 mb-4">
                    {user.total_credits_used.toLocaleString()}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setTransactionsOpen(true)}
                  >
                    <History className="w-4 h-4" />
                    查看明细
                  </Button>
                </CardContent>
              </Card>

              {/* Account Status Card */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Shield className="w-5 h-5 text-purple-500" />
                    账户状态
                  </CardTitle>
                  <CardDescription>权限与安全</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
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
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">快速入口</CardTitle>
                <CardDescription>常用功能</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => router.push("/scripts")}
                  >
                    <User className="w-5 h-5 text-orange-500" />
                    <span className="text-sm">剧本记录</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => router.push("/projects")}
                  >
                    <User className="w-5 h-5 text-blue-500" />
                    <span className="text-sm">分镜项目</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => router.push("/generated")}
                  >
                    <User className="w-5 h-5 text-purple-500" />
                    <span className="text-sm">生成图库</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
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
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">算力管理</CardTitle>
                <CardDescription>查看和管理您的算力</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                  <div>
                    <div className="text-sm text-zinc-400 mb-1">当前余额</div>
                    <div className="text-2xl font-bold text-emerald-500">
                      {user.credits.toLocaleString()} 算力
                    </div>
                  </div>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => setRechargeOpen(true)}
                  >
                    充值
                  </Button>
                </div>

                <Separator className="bg-zinc-800" />

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">使用统计</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded">
                      <span className="text-sm text-zinc-400">累计消耗</span>
                      <span className="font-mono font-semibold text-white">
                        {user.total_credits_used.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded">
                      <span className="text-sm text-zinc-400">剩余算力</span>
                      <span className="font-mono font-semibold text-emerald-500">
                        {user.credits.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2"
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
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">账户设置</CardTitle>
                <CardDescription>管理您的账户信息和偏好设置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-white">基本信息</h3>
                  <div className="p-4 bg-zinc-800/50 rounded space-y-3">
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
                    className="w-full gap-2"
                    onClick={() => setEditProfileOpen(true)}
                  >
                    <SettingsIcon className="w-4 h-4" />
                    编辑基本信息
                  </Button>
                </div>

                <Separator className="bg-zinc-800" />

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-white">安全设置</h3>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => setChangePasswordOpen(true)}
                    >
                      <Shield className="w-4 h-4" />
                      修改密码
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Mail className="w-4 h-4" />
                      更换邮箱
                    </Button>
                  </div>
                </div>

                <Separator className="bg-zinc-800" />

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-red-400">危险操作</h3>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-red-950/20"
                  >
                    <LogOut className="w-4 h-4" />
                    注销账户
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
