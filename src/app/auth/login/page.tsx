"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Shield, ArrowLeft, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/ui/glass-card";

const LoginPage = () => {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password) {
      toast({ title: "请填写邮箱和密码", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "登录失败", description: data.message || "请稍后再试", variant: "destructive" });
        return;
      }
      toast({ title: "登录成功", description: "欢迎回来" });
      router.replace("/");
    } catch (error) {
      toast({ title: "登录失败", description: "网络异常，请稍后重试", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background Glows */}
      <div className="fixed top-0 left-0 w-full h-[500px] bg-orange-500/5 blur-[120px] pointer-events-none select-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] pointer-events-none select-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>返回首页</span>
        </Link>
        <h2 className="text-center text-3xl font-bold tracking-tight text-white">
          登录 ComicAI
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          继续您的漫画创作之旅
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <GlassCard className="py-8 px-4 sm:px-10 border-zinc-800 bg-zinc-900/40 backdrop-blur-xl">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">邮箱地址</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-zinc-500" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@example.com"
                  className="pl-10 bg-zinc-950/50 border-zinc-700 focus:border-orange-500/50 focus:ring-orange-500/20 text-white placeholder:text-zinc-600"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">密码</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-500" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="pl-10 bg-zinc-950/50 border-zinc-700 focus:border-orange-500/50 focus:ring-orange-500/20 text-white placeholder:text-zinc-600"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-orange-400 hover:text-orange-300"
                >
                  忘记密码？
                </Link>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 py-5 font-semibold text-base"
              >
                {loading ? "登录中..." : "立即登录"}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-700/50" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#121214] text-zinc-500 rounded-full">
                  还没有账号？
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link href="/auth/register">
                <Button variant="outline" className="w-full border-zinc-700 bg-zinc-800/30 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 py-5">
                  注册新账号
                </Button>
              </Link>
            </div>
          </div>
        </GlassCard>
        
        {/* Helper Links */}
        <div className="mt-6 text-center text-xs text-zinc-500 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> 安全加密传输</span>
            <span>|</span>
            <span className="flex items-center gap-1"><LogIn className="w-3 h-3" /> 7天免登录</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
