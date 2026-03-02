"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface RechargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface RechargePlan {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

const rechargePlans: RechargePlan[] = [
  { id: "basic", name: "基础套餐", credits: 5000, price: 9.9 },
  { id: "standard", name: "标准套餐", credits: 15000, price: 29.9, bonus: 1000, popular: true },
  { id: "premium", name: "高级套餐", credits: 50000, price: 99.9, bonus: 5000 },
  { id: "ultimate", name: "至尊套餐", credits: 100000, price: 199.9, bonus: 15000 },
];

type Step = "select" | "paying" | "success";

export function RechargeDialog({ open, onOpenChange, onSuccess }: RechargeDialogProps) {
  const [step, setStep] = useState<Step>("select");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay">("wechat");
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [payingOrder, setPayingOrder] = useState<{
    planName: string;
    amount: number;
    credits: number;
  } | null>(null);
  const [successData, setSuccessData] = useState<{ credits: number; newBalance: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetState = useCallback(() => {
    setStep("select");
    setOrderId(null);
    setPayingOrder(null);
    setSuccessData(null);
    setPaymentMethod("wechat");
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  const handleRecharge = async () => {
    const plan = rechargePlans.find((p) => p.id === selectedPlan);
    if (!plan) {
      toast.error("请选择充值套餐");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          amount: plan.price,
          credits: plan.credits + (plan.bonus ?? 0),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "创建订单失败");
      }

      setOrderId(data.orderId);
      setPayingOrder({
        planName: plan.name,
        amount: data.amount,
        credits: data.credits,
      });
      setStep("paying");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建订单失败");
    } finally {
      setCreating(false);
    }
  };

  const checkOrderStatus = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/payment/check-order?orderId=${encodeURIComponent(orderId)}`);
      const data = await res.json();
      if (data.success && data.status === "paid") {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setSuccessData({
          credits: data.credits ?? 0,
          newBalance: data.newBalance ?? 0,
        });
        setStep("success");
        onSuccess?.();
      }
    } catch {
      // 轮询静默失败，下次继续
    }
  }, [orderId, onSuccess]);

  useEffect(() => {
    if (step === "paying" && orderId) {
      pollRef.current = setInterval(checkOrderStatus, 3000);
      return () => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };
    }
  }, [step, orderId, checkOrderStatus]);

  const handlePayComplete = async () => {
    if (!orderId) return;
    setChecking(true);
    try {
      const res = await fetch("/api/payment/simulate-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "处理失败");
      }

      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }

      setSuccessData({
        credits: data.credits ?? 0,
        newBalance: data.newBalance ?? 0,
      });
      setStep("success");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "处理失败");
    } finally {
      setChecking(false);
    }
  };

  const handleBackFromPaying = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setStep("select");
    setOrderId(null);
    setPayingOrder(null);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            充值算力
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {step === "select" && "选择合适的套餐为您的账户充值算力"}
            {step === "paying" && "请使用微信或支付宝扫码完成支付"}
            {step === "success" && "充值成功"}
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-6">
              {rechargePlans.map((plan) => {
                const totalCredits = plan.credits + (plan.bonus ?? 0);
                const isSelected = selectedPlan === plan.id;

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-zinc-800 bg-zinc-800/50 hover:border-zinc-700"
                    }`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange-500 text-white">
                        推荐
                      </Badge>
                    )}

                    {isSelected && (
                      <div className="absolute top-4 right-4">
                        <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}

                    <div className="text-center space-y-4">
                      <div>
                        <div className="text-3xl font-bold text-white mb-1">
                          {plan.credits.toLocaleString()}
                        </div>
                        {plan.bonus && (
                          <div className="text-sm text-emerald-500">
                            + {plan.bonus.toLocaleString()} 赠送
                          </div>
                        )}
                        <div className="text-xs text-zinc-500 mt-1">算力</div>
                      </div>

                      <div>
                        <div className="text-2xl font-bold text-orange-500">
                          ¥{plan.price}
                        </div>
                        {plan.bonus && (
                          <div className="text-xs text-zinc-500 mt-1">
                            实得 {totalCredits.toLocaleString()} 算力
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-zinc-400">
                        约 ¥{((plan.price / totalCredits) * 1000).toFixed(2)} / 千算力
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
              <div className="text-sm font-medium text-white">支付说明</div>
              <ul className="text-xs text-zinc-400 space-y-1">
                <li>• 充值后算力立即到账</li>
                <li>• 算力永久有效，不会过期</li>
                <li>• 支持微信、支付宝支付</li>
                <li>• 如有问题请联系客服</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button
                onClick={handleRecharge}
                disabled={!selectedPlan || creating}
                className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
              >
                <Zap className="w-4 h-4" />
                {creating ? "创建中..." : "立即充值"}
              </Button>
            </div>
          </>
        )}

        {step === "paying" && payingOrder && (
          <div className="space-y-6 py-4">
            <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
              <div className="text-sm font-medium text-white">订单信息</div>
              <div className="text-zinc-300">
                套餐：{payingOrder.planName} {payingOrder.credits.toLocaleString()} 算力
              </div>
              <div className="text-xl font-bold text-orange-500">
                金额：¥{payingOrder.amount}
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="w-48 h-48 rounded-lg border-2 border-dashed border-zinc-600 flex flex-col items-center justify-center bg-zinc-800/30">
                <span className="text-zinc-400 text-sm">扫码支付</span>
                <span className="text-zinc-500 text-xs mt-1">（支付功能即将上线）</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={paymentMethod === "wechat" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaymentMethod("wechat")}
                  className={paymentMethod === "wechat" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  微信支付
                </Button>
                <Button
                  variant={paymentMethod === "alipay" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaymentMethod("alipay")}
                  className={paymentMethod === "alipay" ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  支付宝
                </Button>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleBackFromPaying}>
                取消
              </Button>
              <Button
                onClick={handlePayComplete}
                disabled={checking}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {checking ? "处理中..." : "我已完成支付"}
              </Button>
            </div>
          </div>
        )}

        {step === "success" && successData && (
          <div className="py-8 flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="text-center space-y-2">
              <div className="text-xl font-bold text-white">充值成功</div>
              <div className="text-zinc-400">
                已到账 {successData.credits.toLocaleString()} 算力
              </div>
              <div className="text-2xl font-bold text-orange-500">
                当前余额：{successData.newBalance.toLocaleString()} 算力
              </div>
            </div>
            <Button
              onClick={handleClose}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              完成
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
