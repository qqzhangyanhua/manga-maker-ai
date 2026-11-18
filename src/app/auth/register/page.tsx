"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, ShieldCheck, ArrowLeft, Sparkles, Loader2, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/ui/glass-card";

const RegisterForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const trialId = searchParams.get("trial");
  const hasTrialWork = !!trialId;

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countdown) return;
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!email) {
      toast({ title: "请输入邮箱", variant: "destructive" });
      return;
    }

    try {
      setSending(true);
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "发送失败", description: data.message || "请稍后再试", variant: "destructive" });
        return;
      }
      setCountdown(60);
      toast({ title: "验证码已发送", description: "请在 10 分钟内填写邮件中的验证码" });
    } catch (error) {
      toast({ title: "发送失败", description: "网络异常，请稍后重试", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password || !code) {
      toast({ title: "请填写完整信息", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, code, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "注册失败", description: data.message || "请稍后再试", variant: "destructive" });
        return;
      }

      if (trialId) {
        try {
          const claimRes = await fetch("/api/trial/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trialId }),
          });
          const claimData = await claimRes.json();

          if (claimRes.ok && claimData.projectId) {
            toast({
              title: "注册成功",
              description: "体验作品已保存到你的账号，正在跳转..."
            });
            router.replace(`/projects/${claimData.projectId}`);
            return;
          }
        } catch (claimError) {
          console.error("关联体验作品失败:", claimError);
        }
      }

      toast({ title: "注册成功", description: "已为你自动登录" });
      router.replace("/workspace");
    } catch (error) {
      toast({ title: "注册失败", description: "网络异常，请稍后重试", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black py-12 sm:px-6 lg:px-8 flex flex-col justify-center">
      {/* Background Glows */}
      <div className="fixed top-0 left-0 w-full h-[500px] bg-orange-500/5 blur-[120px] pointer-events-none select-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] pointer-events-none select-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl relative z-10 px-4 sm:px-0">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>返回首页</span>
        </Link>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Info Panel */}
          <div className="lg:col-span-2 space-y-6 text-center lg:text-left">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                创建账号
              </h2>
              <p className="text-zinc-400">
                加入 ComicAI，开始您的创作之旅。只需几步即可完成注册。
              </p>
            </div>

            {hasTrialWork && (
              <GlassCard className="p-4 bg-orange-500/10 border-orange-500/30">
                <h3 className="font-semibold flex items-center gap-2 text-orange-400 mb-1">
                  <Sparkles className="w-4 h-4" />
                  保存体验作品
                </h3>
                <p className="text-xs text-zinc-400">
                  注册后，您刚才生成的 4 格漫画将自动保存到您的账号。
                </p>
              </GlassCard>
            )}

            <div className="hidden lg:block space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-zinc-800/50 text-orange-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">安全保障</h4>
                  <p className="text-xs text-zinc-500 mt-1">邮箱验证确保您的账户安全，密码加密存储。</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-zinc-800/50 text-blue-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">无限创意</h4>
                  <p className="text-xs text-zinc-500 mt-1">注册即享免费算力，体验 AI 辅助漫画创作。</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="lg:col-span-3">
            <GlassCard className="py-8 px-4 sm:px-8 border-zinc-800 bg-zinc-900/40 backdrop-blur-xl">
              <form className="space-y-5" onSubmit={handleRegister}>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-300">邮箱地址</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-zinc-500" />
                      </div>
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="name@example.com"
                        className="pl-10 bg-zinc-950/50 border-zinc-700 focus:border-orange-500/50 focus:ring-orange-500/20 text-white placeholder:text-zinc-600"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleSendCode} 
                      disabled={sending || countdown > 0}
                      className="whitespace-nowrap border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      {countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code" className="text-zinc-300">验证码</Label>
                  <div className="flex justify-center sm:justify-start">
                    <InputOTP maxLength={6} value={code} onChange={setCode}>
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <InputOTPSlot 
                            key={index} 
                            index={index} 
                            className="bg-zinc-950/50 border-zinc-700 text-white w-10 h-12 sm:w-12 sm:h-14" 
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-zinc-300">昵称 (可选)</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-zinc-500" />
                    </div>
                    <Input
                      id="name"
                      placeholder="您的称呼"
                      className="pl-10 bg-zinc-950/50 border-zinc-700 focus:border-orange-500/50 focus:ring-orange-500/20 text-white placeholder:text-zinc-600"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-zinc-300">设置密码</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-zinc-500" />
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      placeholder="至少 8 位字符"
                      className="pl-10 bg-zinc-950/50 border-zinc-700 focus:border-orange-500/50 focus:ring-orange-500/20 text-white placeholder:text-zinc-600"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 py-5 font-semibold text-base mt-2"
                >
                  {loading ? "注册中..." : "完成注册"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-zinc-500">
                  已有账号？{" "}
                  <Link href="/auth/login" className="text-orange-400 hover:text-orange-300 font-medium hover:underline">
                    直接登录
                  </Link>
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

const RegisterLoading = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
  </div>
);

const RegisterPage = () => {
  return (
    <Suspense fallback={<RegisterLoading />}>
      <RegisterForm />
    </Suspense>
  );
};

export default RegisterPage;
