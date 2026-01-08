"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, ShieldCheck, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";

const RegisterForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // 获取 trial 参数
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

      // 如果有 trialId，尝试关联体验作品
      if (trialId) {
        try {
          const claimRes = await fetch("/api/trial/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trialId }),
          });
          const claimData = await claimRes.json();

          if (claimRes.ok && claimData.storyId) {
            toast({
              title: "注册成功",
              description: "体验作品已保存到你的账号，正在跳转..."
            });
            router.replace(`/scripts/${claimData.storyId}`);
            return;
          }
        } catch (claimError) {
          console.error("关联体验作品失败:", claimError);
          // 关联失败不影响注册成功
        }
      }

      toast({ title: "注册成功", description: "已为你自动登录" });
      router.replace("/");
    } catch (error) {
      toast({ title: "注册失败", description: "网络异常，请稍后重试", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1410' }}>
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col gap-8">
        <div className="flex items-center justify-between mt-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
          <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
            已有账号？去登录
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-primary" />
              注册 ComicAI 账号
            </h1>
            <p className="text-muted-foreground">
              完成邮箱验证后即可使用分镜生成、剧本创作等功能，验证码将发送到你的邮箱，10 分钟内有效。
            </p>

            {/* 体验作品保存提示 */}
            {hasTrialWork && (
              <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-4 space-y-2">
                <h3 className="font-semibold flex items-center gap-2 text-primary">
                  <Sparkles className="w-4 h-4" />
                  保存你的体验作品
                </h3>
                <p className="text-sm text-muted-foreground">
                  完成注册后，你刚才生成的 4 格漫画将自动保存到你的账号，你可以继续编辑和导出。
                </p>
              </div>
            )}

            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4" />
                验证码说明
              </h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>验证码为 6 位数字，10 分钟内有效</li>
                <li>同一邮箱只保留最近一次验证码</li>
                <li>如果未收到邮件，请检查垃圾箱或稍后再试</li>
              </ul>
            </div>
          </div>

          <Card className="shadow-lg border-border/80">
            <CardHeader>
              <CardTitle>注册并验证邮箱</CardTitle>
              <CardDescription>填写邮箱获取验证码，完成注册后将自动登录</CardDescription>
            </CardHeader>

            <CardContent>
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={handleSendCode} disabled={sending || countdown > 0}>
                      {countdown > 0 ? `${countdown}s 后重发` : "发送验证码"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">昵称（可选）</Label>
                  <Input
                    id="name"
                    placeholder="用于展示的昵称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="至少 8 位，建议含字母数字"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>邮箱验证码</Label>
                  <InputOTP maxLength={6} value={code} onChange={setCode}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "注册中..." : "完成注册并登录"}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="text-sm text-muted-foreground justify-center">
              已有账号？
              <Link href="/auth/login" className="text-primary ml-1 hover:underline">
                去登录
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

const RegisterLoading = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1410' }}>
    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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
