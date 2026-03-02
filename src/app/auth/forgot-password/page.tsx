"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"email" | "verify" | "done">("email");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "请输入邮箱", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "发送失败");
      }

      toast({ title: "验证码已发送", description: "请查收邮箱" });
      setStep("verify");
    } catch (error) {
      toast({
        title: "发送失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!code || !newPassword) {
      toast({ title: "请填写完整", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "密码至少 6 位", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "重置失败");
      }

      setStep("done");
      toast({ title: "密码重置成功" });
    } catch (error) {
      toast({
        title: "重置失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          返回登录
        </Link>

        <GlassCard className="p-8">
          {step === "email" && (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="text-center mb-6">
                <Mail className="w-12 h-12 text-orange-400 mx-auto mb-3" />
                <h1 className="text-2xl font-bold text-white">找回密码</h1>
                <p className="text-sm text-zinc-400 mt-1">输入注册邮箱，我们将发送验证码</p>
              </div>
              <div>
                <Label className="text-zinc-300">邮箱地址</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1 bg-zinc-800/50 border-zinc-700"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                发送验证码
              </Button>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-white">重置密码</h1>
                <p className="text-sm text-zinc-400 mt-1">
                  验证码已发送至 {email}
                </p>
              </div>
              <div>
                <Label className="text-zinc-300">验证码</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6 位验证码"
                  className="mt-1 bg-zinc-800/50 border-zinc-700 text-center tracking-widest text-lg"
                  maxLength={6}
                  required
                />
              </div>
              <div>
                <Label className="text-zinc-300">新密码</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="至少 6 位"
                  className="mt-1 bg-zinc-800/50 border-zinc-700"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                重置密码
              </Button>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full text-sm text-zinc-500 hover:text-zinc-300"
              >
                重新发送验证码
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">密码重置成功</h2>
              <p className="text-sm text-zinc-400 mb-6">现在可以使用新密码登录了</p>
              <Link href="/auth/login">
                <Button className="bg-orange-500 hover:bg-orange-600">
                  前往登录
                </Button>
              </Link>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
