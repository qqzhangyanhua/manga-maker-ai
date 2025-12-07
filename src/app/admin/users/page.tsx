"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type User = {
  id: number;
  email: string;
  name: string | null;
  role: "user" | "admin";
  status: "active" | "banned";
  verified: boolean;
  created_at?: string;
  updated_at?: string;
};

type UserForm = {
  email: string;
  password: string;
  name: string;
  role: "user" | "admin";
  status: "active" | "banned";
  verified: boolean;
};

const emptyForm: UserForm = {
  email: "",
  password: "",
  name: "",
  role: "user",
  status: "active",
  verified: true,
};

const AdminUsersPage = () => {
  const { data: currentUser, isLoading: userLoading, error: userError } = useCurrentUser();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const isAdmin = useMemo(() => (currentUser?.role || "user") === "admin", [currentUser]);

  const fetchUsers = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "获取用户列表失败");
      setUsers(data.data.users as User[]);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload: any = { ...form };
      if (editingId) {
        // 编辑时不允许修改邮箱；仅在需要时提交密码
        delete payload.email;
        if (!payload.password) delete payload.password;
        const res = await fetch(`/api/admin/users/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "更新失败");
      } else {
        if (!payload.password) {
          throw new Error("创建用户时密码必填");
        }
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "创建失败");
      }

      setMessage("保存成功");
      resetForm();
      fetchUsers();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
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
    setMessage("");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该用户吗？")) return;
    setMessage("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "删除失败");
      setMessage("删除成功");
      fetchUsers();
    } catch (error) {
      setMessage((error as Error).message);
    }
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">用户管理</h1>
        <p className="text-muted-foreground">
          手动新增用户（免验证码）、编辑、封禁或删除用户。
        </p>
      </div>

      {message && (
        <div className="p-3 rounded-md bg-muted text-sm text-foreground border border-border">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-lg border border-border bg-card">
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
          <Button type="submit" disabled={saving}>
            {saving ? "保存中..." : editingId ? "更新用户" : "新增用户"}
          </Button>
          {editingId && (
            <Button type="button" variant="secondary" onClick={resetForm}>
              取消编辑
            </Button>
          )}
        </div>
      </form>

      <div className="rounded-lg border border-border overflow-hidden">
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
                <th className="px-3 py-2 text-left">创建时间</th>
                <th className="px-3 py-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-3" colSpan={8}>
                    正在加载...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-3 py-3" colSpan={8}>
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
                    <td className="px-3 py-2">{u.created_at ? new Date(u.created_at).toLocaleString() : "-"}</td>
                    <td className="px-3 py-2 space-x-2">
                      <Button size="sm" variant="secondary" onClick={() => handleEdit(u)}>
                        编辑
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(u.id)}>
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
    </div>
  );
};

export default AdminUsersPage;
