"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-8">
        <div className="flex items-center justify-between mt-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
          <Link href="/auth/register" className="text-sm text-muted-foreground hover:text-foreground">
            还没有账号？去注册
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              登录 ComicAI
            </h1>
            <p className="text-muted-foreground">
              使用已验证的邮箱和密码登录，登录后即可同步使用分镜编辑、剧本创作等功能。
            </p>
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                使用提示
              </h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>确保邮箱已完成注册与验证</li>
                <li>密码至少 8 位，区分大小写</li>
                <li>如忘记密码，可重新注册并验证覆盖旧密码</li>
              </ul>
            </div>
          </div>

          <Card className="shadow-lg border-border/80">
            <CardHeader>
              <CardTitle>邮箱登录</CardTitle>
              <CardDescription>输入邮箱与密码，成功后将写入安全 Cookie</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "登录中..." : "登录"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground justify-center">
              还没有账号？
              <Link href="/auth/register" className="text-primary ml-1 hover:underline">
                去注册
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
