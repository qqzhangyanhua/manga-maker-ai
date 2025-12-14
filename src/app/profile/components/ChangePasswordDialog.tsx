"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const getPasswordStrength = (password: string): { level: number; text: string; color: string } => {
    if (password.length === 0) return { level: 0, text: "", color: "" };
    if (password.length < 6) return { level: 1, text: "弱", color: "text-red-500" };
    if (password.length < 10) return { level: 2, text: "中", color: "text-amber-500" };
    if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { level: 3, text: "强", color: "text-emerald-500" };
    }
    return { level: 2, text: "中", color: "text-amber-500" };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSubmit = async () => {
    // 验证
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("请填写所有字段");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("新密码至少需要6个字符");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("两次输入的新密码不一致");
      return;
    }

    if (oldPassword === newPassword) {
      toast.error("新密码不能与旧密码相同");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "修改失败");
      }

      toast.success("密码修改成功");

      // 重置表单
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onOpenChange(false);
    } catch (error) {
      console.error("修改密码失败:", error);
      toast.error(error instanceof Error ? error.message : "修改失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>修改密码</DialogTitle>
          <DialogDescription className="text-zinc-400">
            请输入当前密码和新密码
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 旧密码 */}
          <div className="space-y-2">
            <Label htmlFor="old-password">当前密码</Label>
            <div className="relative">
              <Input
                id="old-password"
                type={showOldPassword ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="请输入当前密码"
                className="bg-zinc-800 border-zinc-700 text-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 新密码 */}
          <div className="space-y-2">
            <Label htmlFor="new-password">新密码</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少6个字符"
                className="bg-zinc-800 border-zinc-700 text-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword && (
              <div className="flex items-center gap-2 text-xs">
                <div className="flex-1 h-1 bg-zinc-800 rounded overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      passwordStrength.level === 1
                        ? "w-1/3 bg-red-500"
                        : passwordStrength.level === 2
                        ? "w-2/3 bg-amber-500"
                        : "w-full bg-emerald-500"
                    }`}
                  />
                </div>
                <span className={passwordStrength.color}>
                  密码强度: {passwordStrength.text}
                </span>
              </div>
            )}
          </div>

          {/* 确认新密码 */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">确认新密码</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
                className="bg-zinc-800 border-zinc-700 text-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500">两次输入的密码不一致</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              !oldPassword ||
              !newPassword ||
              !confirmPassword ||
              newPassword !== confirmPassword
            }
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            确认修改
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
