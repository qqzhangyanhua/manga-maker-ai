"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAdminList } from "@/hooks/admin/use-admin-list";
import { useAdminMutations } from "@/hooks/admin/use-admin-mutations";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserCog } from "lucide-react";
import { User, UserForm, emptyForm } from "./types";

const AdminUsersPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: currentUser, isLoading: userLoading, error: userError } = useCurrentUser();

  // Form state
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Dialog state
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [rechargingUser, setRechargingUser] = useState<User | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState<string>("");

  const isAdmin = useMemo(() => (currentUser?.role || "user") === "admin", [currentUser]);

  // Fetch users list using React Query
  const {
    items: users,
    loading,
    refetch,
  } = useAdminList<User, Record<string, never>>({
    endpoint: "/api/admin/users",
    autoFetch: isAdmin,
  });

  // CRUD mutations
  const { create, update, remove } = useAdminMutations<User, UserForm>({
    endpoint: "/api/admin/users",
    queryKey: ["admin-list", "/api/admin/users"],
    resourceName: "用户",
  });

  // Recharge mutation
  const rechargeMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: number; amount: number }) => {
      const response = await fetch(`/api/admin/users/${userId}/recharge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const result = await response.json().catch(() => ({ message: "充值失败" }));

      if (!response.ok) {
        throw new Error(result.message || "充值失败");
      }

      return result;
    },
    onSuccess: () => {
      toast({
        title: "充值成功",
        description: "算力已充值",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-list", "/api/admin/users"] });
      setRechargingUser(null);
      setRechargeAmount("");
    },
    onError: (error: Error) => {
      toast({
        title: "充值失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      // Update existing user
      const payload: Partial<UserForm> = {
        name: form.name,
        role: form.role,
        status: form.status,
        verified: form.verified,
      };

      // Only include password if provided
      if (form.password) {
        payload.password = form.password;
      }

      update.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            resetForm();
          },
        }
      );
    } else {
      // Create new user
      if (!form.password) {
        toast({
          title: "验证失败",
          description: "创建用户时密码必填",
          variant: "destructive",
        });
        return;
      }

      create.mutate(form, {
        onSuccess: () => {
          resetForm();
        },
      });
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setForm({
      email: user.email,
      password: "",
      name: user.name || "",
      role: user.role,
      status: user.status,
      verified: user.verified,
    });
  };

  const handleDelete = (user: User) => {
    setDeletingUser(user);
  };

  const confirmDelete = () => {
    if (!deletingUser) return;
    remove.mutate(deletingUser.id, {
      onSuccess: () => {
        setDeletingUser(null);
      },
    });
  };

  const handleRecharge = (user: User) => {
    setRechargingUser(user);
    setRechargeAmount("");
  };

  const confirmRecharge = () => {
    if (!rechargingUser || !rechargeAmount) return;

    const amount = parseInt(rechargeAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "验证失败",
        description: "请输入有效的充值金额（正整数）",
        variant: "destructive",
      });
      return;
    }

    rechargeMutation.mutate({ userId: rechargingUser.id, amount });
  };

  if (userLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">用户管理</h1>
        <p>正在加载用户信息...</p>
      </div>
    );
  }

  if (userError || !currentUser) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">用户管理</h1>
        <p>请先登录后访问本页面。</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">用户管理</h1>
        <p>当前账号权限不足，需要管理员角色。</p>
      </div>
    );
  }

  const isSaving = create.isPending || update.isPending;

  return (
    <div className="min-h-screen halftone-pattern">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="relative">
          <div className="absolute -left-4 -top-4 w-20 h-20 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse" />
          <h1 className="text-5xl font-bold mb-4 flex items-center gap-3 comic-title relative z-10">
            <UserCog className="w-12 h-12 text-primary drop-shadow-md" />
            用户管理
          </h1>
          <p className="text-xl text-muted-foreground font-medium pl-2 border-l-4 border-primary/50">
            手动新增用户（免验证码）、编辑、封禁或删除用户。
          </p>
        </div>

        <div className="p-5 comic-card bg-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>邮箱*</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  required={!editingId}
                  disabled={!!editingId}
                />
              </div>
              <div className="space-y-2">
                <Label>{editingId ? "重置密码（可选）" : "密码*"}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={editingId ? "留空则不修改" : "至少 8 位"}
                  required={!editingId}
                />
              </div>
              <div className="space-y-2">
                <Label>昵称</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="可选"
                />
              </div>
              <div className="space-y-2">
                <Label>角色</Label>
                <Select
                  value={form.role}
                  onValueChange={(val: "user" | "admin") => setForm((prev) => ({ ...prev, role: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">user</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select
                  value={form.status}
                  onValueChange={(val: "active" | "banned") => setForm((prev) => ({ ...prev, status: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">active</SelectItem>
                    <SelectItem value="banned">banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex items-center gap-3">
                <Label className="min-w-[80px]">已验证</Label>
                <Switch
                  checked={form.verified}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, verified: checked }))}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                {isSaving ? "保存中..." : editingId ? "更新用户" : "新增用户"}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  取消编辑
                </Button>
              )}
            </div>
          </form>
        </div>

        <div className="p-5 comic-card bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">邮箱</th>
                  <th className="px-3 py-2 text-left">昵称</th>
                  <th className="px-3 py-2 text-left">角色</th>
                  <th className="px-3 py-2 text-left">状态</th>
                  <th className="px-3 py-2 text-left">验证</th>
                  <th className="px-3 py-2 text-left">算力余额</th>
                  <th className="px-3 py-2 text-left">创建时间</th>
                  <th className="px-3 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={9}>
                      正在加载...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={9}>
                      暂无用户。
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="px-3 py-2">{u.id}</td>
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2">{u.name || "-"}</td>
                      <td className="px-3 py-2">{u.role}</td>
                      <td className="px-3 py-2">{u.status}</td>
                      <td className="px-3 py-2">{u.verified ? "是" : "否"}</td>
                      <td className="px-3 py-2 font-semibold text-primary">{u.credits}</td>
                      <td className="px-3 py-2">{u.created_at ? new Date(u.created_at).toLocaleString() : "-"}</td>
                      <td className="px-3 py-2 space-x-2">
                        <Button size="sm" variant="secondary" onClick={() => handleEdit(u)}>
                          编辑
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRecharge(u)}>
                          充值
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(u)}>
                          删除
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 删除确认对话框 */}
        <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除用户</AlertDialogTitle>
              <AlertDialogDescription>
                {deletingUser && (
                  <>
                    确定要删除用户 <strong>{deletingUser.email}</strong> 吗？
                    <br />
                    此操作不可恢复。
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remove.isPending}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={remove.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {remove.isPending ? "删除中..." : "删除"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 充值对话框 */}
        <AlertDialog open={!!rechargingUser} onOpenChange={(open) => !open && setRechargingUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>给用户充值算力</AlertDialogTitle>
              <AlertDialogDescription>
                {rechargingUser && (
                  <div className="space-y-4">
                    <div className="text-sm">
                      <p>
                        用户邮箱：<strong>{rechargingUser.email}</strong>
                      </p>
                      <p>
                        当前算力余额：<strong className="text-primary">{rechargingUser.credits}</strong>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recharge-amount">充值金额（正整数）</Label>
                      <Input
                        id="recharge-amount"
                        type="number"
                        min="1"
                        step="1"
                        value={rechargeAmount}
                        onChange={(e) => setRechargeAmount(e.target.value)}
                        placeholder="请输入充值金额"
                        disabled={rechargeMutation.isPending}
                      />
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={rechargeMutation.isPending}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRecharge}
                disabled={rechargeMutation.isPending || !rechargeAmount}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {rechargeMutation.isPending ? "充值中..." : "确认充值"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AdminUsersPage;
