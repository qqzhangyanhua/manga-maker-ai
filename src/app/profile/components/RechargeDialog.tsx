"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap } from "lucide-react";
import { toast } from "sonner";

interface RechargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RechargePlan {
  id: string;
  credits: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

const rechargePlans: RechargePlan[] = [
  {
    id: "basic",
    credits: 5000,
    price: 9.9,
  },
  {
    id: "standard",
    credits: 15000,
    price: 29.9,
    bonus: 1000,
    popular: true,
  },
  {
    id: "premium",
    credits: 50000,
    price: 99.9,
    bonus: 5000,
  },
  {
    id: "ultimate",
    credits: 100000,
    price: 199.9,
    bonus: 15000,
  },
];

export function RechargeDialog({ open, onOpenChange }: RechargeDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleRecharge = () => {
    const plan = rechargePlans.find((p) => p.id === selectedPlan);
    if (!plan) {
      toast.error("请选择充值套餐");
      return;
    }

    // TODO: 集成支付系统
    toast.info("支付功能开发中，敬请期待");
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
            选择合适的套餐为您的账户充值算力
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-6">
          {rechargePlans.map((plan) => {
            const totalCredits = plan.credits + (plan.bonus || 0);
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
                  {/* Credits */}
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

                  {/* Price */}
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

                  {/* Value */}
                  <div className="text-xs text-zinc-400">
                    约 ¥{(plan.price / totalCredits * 1000).toFixed(2)} / 千算力
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment Info */}
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
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            onClick={handleRecharge}
            disabled={!selectedPlan}
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
          >
            <Zap className="w-4 h-4" />
            立即充值
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
