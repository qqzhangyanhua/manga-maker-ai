"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowUpCircle, ArrowDownCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { CreditTransaction } from "../types";

interface TransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionsDialog({ open, onOpenChange }: TransactionsDialogProps) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    if (open) {
      fetchTransactions();
    }
  }, [open, page]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/profile/transactions?limit=${pageSize}&offset=${page * pageSize}`
      );

      if (!response.ok) {
        throw new Error("获取交易记录失败");
      }

      const result = await response.json();
      setTransactions(result.data.transactions);
      setTotal(result.data.total);
    } catch (error) {
      console.error("获取交易记录失败:", error);
      toast.error("获取交易记录失败");
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "register":
        return <Badge className="bg-emerald-500 text-white">注册赠送</Badge>;
      case "recharge":
        return <Badge className="bg-blue-500 text-white">充值</Badge>;
      case "consume":
        return <Badge variant="outline" className="text-orange-500">消耗</Badge>;
      case "admin_adjust":
        return <Badge className="bg-purple-500 text-white">管理员调整</Badge>;
      case "refund":
        return <Badge className="bg-amber-500 text-white">退款</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>交易记录</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTransactions}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            查看您的算力交易历史 (共 {total} 条记录)
          </DialogDescription>
        </DialogHeader>

        {loading && transactions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">暂无交易记录</div>
        ) : (
          <>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-2 rounded-lg ${
                        transaction.amount > 0
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-orange-500/10 text-orange-500"
                      }`}>
                        {transaction.amount > 0 ? (
                          <ArrowUpCircle className="w-5 h-5" />
                        ) : (
                          <ArrowDownCircle className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getActionBadge(transaction.action)}
                          <span className="text-sm text-white">
                            {transaction.description || "算力变动"}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500">
                          {formatDate(transaction.created_at)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          transaction.amount > 0 ? "text-emerald-500" : "text-orange-500"
                        }`}>
                          {transaction.amount > 0 ? "+" : ""}
                          {transaction.amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-zinc-500">
                          余额: {transaction.balance.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <div className="text-sm text-zinc-400">
                  第 {page + 1} / {totalPages} 页
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0 || loading}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1 || loading}
                  >
                    下一页
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
