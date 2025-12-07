"use client";

import Link from "next/link";
import { ShieldCheck, Database, Users } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";

const AdminHomePage = () => {
  const { data: currentUser, isLoading, error } = useCurrentUser();
  const isAdmin = (currentUser?.role || "user") === "admin";

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          管理后台
        </h1>
        <p>正在加载用户信息...</p>
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          管理后台
        </h1>
        <p>请先登录后访问本页面。</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          管理后台
        </h1>
        <p>当前账号权限不足，需要管理员角色。</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <ShieldCheck className="w-7 h-7" />
          管理后台
        </h1>
        <p className="text-muted-foreground">
          管理员功能导航。根据权限进入对应的配置页面。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
              <Database className="w-5 h-5" />
              管理模型配置
            </div>
            <p className="text-muted-foreground text-sm">
              配置 provider_type 对应的模型、base_url、优先级、启用状态。
            </p>
          </div>
          <Link href="/admin/llm-providers">
            <Button variant="outline" size="sm">
              进入
            </Button>
          </Link>
        </div>
        <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
              <Users className="w-5 h-5" />
              用户管理
            </div>
            <p className="text-muted-foreground text-sm">
              手动新增/编辑/封禁/删除用户，免验证码创建。
            </p>
          </div>
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              进入
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminHomePage;
