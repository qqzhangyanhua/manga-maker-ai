"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { Transaction, TransactionListResponse, actionLabels, actionColors, CreditAction } from "./types";

const AdminTransactionsPage = () => {
  const { data: currentUser, isLoading: userLoading, error: userError } = useCurrentUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterUserId, setFilterUserId] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");

  const isAdmin = useMemo(() => (currentUser?.role || "user") === "admin", [currentUser]);

  const fetchTransactions = async (currentPage: number = page) => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });

      if (filterUserId.trim()) {
        params.append("userId", filterUserId.trim());
      }

      if (filterAction !== "all") {
        params.append("action", filterAction);
      }

      const res = await fetch(`/api/admin/transactions?${params.toString()}`, {
        cache: "no-store",
      });
      const data: TransactionListResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.success === false && "message" in data ? data.message : "获取交易记录失败");
      }

      setTransactions(data.data.transactions);
      setTotalPages(data.data.pagination.totalPages);
      setTotal(data.data.pagination.total);
      setPage(currentPage);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchTransactions(1);
    }
  }, [isAdmin, filterAction]);

  const handleSearch = () => {
    fetchTransactions(1);
  };

  const handlePrevPage = () => {
    if (page > 1) {
      fetchTransactions(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      fetchTransactions(page + 1);
    }
  };

  const formatAmount = (amount: number) => {
    const sign = amount > 0 ? "+" : "";
    return `${sign}${amount}`;
  };

  if (userLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">交易历史</h1>
        <p>正在加载用户信息...</p>
      </div>
    );
  }

  if (userError || !currentUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">交易历史</h1>
        <p>请先登录后访问本页面。</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">交易历史</h1>
        <p>当前账号权限不足，需要管理员角色。</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen halftone-pattern">
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        <div className="relative">
          <div className="absolute -left-4 -top-4 w-20 h-20 bg-purple-400 rounded-full blur-3xl opacity-20 animate-pulse" />
          <h1 className="text-5xl font-bold mb-4 flex items-center gap-3 comic-title relative z-10">
            <Receipt className="w-12 h-12 text-primary drop-shadow-md" />
            交易历史
          </h1>
          <p className="text-xl text-muted-foreground font-medium pl-2 border-l-4 border-primary/50">
            查看所有用户的算力交易记录，支持按用户和操作类型筛选。
          </p>
        </div>

        {message && (
          <div className="p-3 rounded-md bg-muted text-sm text-foreground border border-border">
            {message}
          </div>
        )}

        {/* 筛选器 */}
        <div className="p-5 comic-card bg-card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>用户 ID（可选）</Label>
              <Input
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                placeholder="输入用户 ID 筛选"
              />
            </div>
            <div className="space-y-2">
              <Label>操作类型</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="register">注册赠送</SelectItem>
                  <SelectItem value="consume">消耗</SelectItem>
                  <SelectItem value="recharge">充值</SelectItem>
                  <SelectItem value="admin_adjust">管理员调整</SelectItem>
                  <SelectItem value="refund">退款</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                {loading ? "搜索中..." : "搜索"}
              </Button>
            </div>
          </div>
        </div>

        {/* 交易列表 */}
        <div className="p-5 comic-card bg-card overflow-hidden">
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              共 <strong className="text-primary">{total}</strong> 条交易记录
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrevPage}
                disabled={loading || page <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
                上一页
              </Button>
              <span className="text-sm">
                第 {page} / {totalPages} 页
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleNextPage}
                disabled={loading || page >= totalPages}
              >
                下一页
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">交易ID</th>
                  <th className="px-3 py-2 text-left">用户</th>
                  <th className="px-3 py-2 text-left">操作类型</th>
                  <th className="px-3 py-2 text-left">变动金额</th>
                  <th className="px-3 py-2 text-left">余额</th>
                  <th className="px-3 py-2 text-left">描述</th>
                  <th className="px-3 py-2 text-left">关联</th>
                  <th className="px-3 py-2 text-left">时间</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={8}>
                      正在加载...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={8}>
                      暂无交易记录。
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{t.id.slice(0, 8)}...</td>
                      <td className="px-3 py-2">
                        {t.user ? (
                          <div>
                            <p className="font-medium">{t.user.email}</p>
                            {t.user.name && <p className="text-xs text-muted-foreground">{t.user.name}</p>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`font-medium ${actionColors[t.action as CreditAction]}`}>
                          {actionLabels[t.action as CreditAction] || t.action}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`font-bold ${t.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatAmount(t.amount)}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold text-primary">{t.balance}</td>
                      <td className="px-3 py-2 max-w-xs truncate" title={t.description}>
                        {t.description}
                      </td>
                      <td className="px-3 py-2">
                        {t.ref_type ? (
                          <div className="text-xs">
                            <p className="text-muted-foreground">{t.ref_type}</p>
                            {t.ref_id && <p className="font-mono">{t.ref_id.slice(0, 8)}...</p>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {new Date(t.created_at).toLocaleString("zh-CN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTransactionsPage;
