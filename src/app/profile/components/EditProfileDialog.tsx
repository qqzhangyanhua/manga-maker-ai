"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { UserInfo } from "../types";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserInfo;
  onSuccess: (updatedUser: UserInfo) => void;
}

export function EditProfileDialog({ open, onOpenChange, user, onSuccess }: EditProfileDialogProps) {
  const [name, setName] = useState(user.name || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(user.image);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      toast.error("请上传图片文件");
      return;
    }

    // 验证文件大小（4MB）
    if (file.size > 4 * 1024 * 1024) {
      toast.error("图片大小不能超过4MB");
      return;
    }

    setImageFile(file);

    // 生成预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      let imageUrl = user.image;

      // 如果有新图片，先上传
      if (imageFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });

        const base64 = await base64Promise;

        const uploadResponse = await fetch("/api/upload/base64", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64,
            filename: `avatar-${user.id}-${Date.now()}.${imageFile.name.split(".").pop()}`,
          }),
        });

        if (!uploadResponse.ok) {
          throw new Error("上传头像失败");
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
      }

      // 更新用户信息
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          image: imageUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "更新失败");
      }

      const result = await response.json();
      toast.success("更新成功");
      onSuccess(result.data.user);
      onOpenChange(false);
    } catch (error) {
      console.error("更新用户信息失败:", error);
      toast.error(error instanceof Error ? error.message : "更新失败");
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = (name: string | null, email: string) => {
    if (name) {
      return name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>编辑基本信息</DialogTitle>
          <DialogDescription className="text-zinc-400">
            更新您的用户名和头像
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 头像上传 */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24 border-2 border-orange-500">
              <AvatarImage src={imagePreview || undefined} alt={name || "User"} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-500 text-black text-2xl font-bold">
                {getUserInitials(name, user.email)}
              </AvatarFallback>
            </Avatar>

            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => document.getElementById("avatar-upload")?.click()}
              >
                <Upload className="w-4 h-4" />
                上传头像
              </Button>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <p className="text-xs text-zinc-500 mt-2">支持 JPG, PNG, 最大 4MB</p>
            </div>
          </div>

          {/* 用户名输入 */}
          <div className="space-y-2">
            <Label htmlFor="name">用户名</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入用户名"
              maxLength={50}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            <p className="text-xs text-zinc-500">{name.length}/50</p>
          </div>

          {/* 邮箱（只读） */}
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              value={user.email}
              disabled
              className="bg-zinc-800 border-zinc-700 text-zinc-400"
            />
            <p className="text-xs text-zinc-500">邮箱不可修改</p>
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
            disabled={loading || !name.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
