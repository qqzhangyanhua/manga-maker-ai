"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAdminList } from "@/hooks/admin/use-admin-list";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { Transaction, actionLabels, actionColors } from "./types";

interface TransactionFilter extends Record<string, unknown> {
  userId?: string;
  action?: string;
}

const AdminTransactionsPage = () => {
  const { data: currentUser, isLoading: userLoading, error: userError } = useCurrentUser();
  const [tempFilterUserId, setTempFilterUserId] = useState("");
  const [tempFilterAction, setTempFilterAction] = useState<string>("all");

  const isAdmin = useMemo(() => (currentUser?.role || "user") === "admin", [currentUser]);

  // Active filter state (used for actual API calls)
  const [activeFilter, setActiveFilter] = useState<TransactionFilter>({});

  // Fetch transactions list using React Query
  const {
    items: transactions,
    loading,
    total,
    page,
    totalPages,
    setPage,
    setFilter,
    error: fetchError,
  } = useAdminList<Transaction, TransactionFilter>({
    endpoint: "/api/admin/transactions",
    initialFilter: {},
    autoFetch: isAdmin,
    itemsKey: "transactions",
  });

  const handleSearch = () => {
    // Build filter object
    const newFilter: TransactionFilter = {};
    if (tempFilterUserId.trim()) {
      newFilter.userId = tempFilterUserId.trim();
    }
    if (tempFilterAction !== "all") {
      newFilter.action = tempFilterAction;
    }

    setFilter(newFilter);
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
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

        {/* 筛选器 */}
        <div className="p-5 comic-card bg-card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>用户 ID（可选）</Label>
              <Input
                value={tempFilterUserId}
                onChange={(e) => setTempFilterUserId(e.target.value)}
                placeholder="输入用户 ID 筛选"
              />
            </div>
            <div className="space-y-2">
              <Label>操作类型</Label>
              <Select value={tempFilterAction} onValueChange={setTempFilterAction}>
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
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={page === 1 || loading}
                className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <ChevronLeft className="w-4 h-4" />
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page === totalPages || loading}
                className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
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
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">用户</th>
                  <th className="px-3 py-2 text-left">操作</th>
                  <th className="px-3 py-2 text-left">金额</th>
                  <th className="px-3 py-2 text-left">余额</th>
                  <th className="px-3 py-2 text-left">描述</th>
                  <th className="px-3 py-2 text-left">时间</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={7}>
                      正在加载...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={7}>
                      暂无交易记录。
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{t.id}</td>
                      <td className="px-3 py-2">
                        {t.user ? (
                          <div>
                            <div className="font-medium">{t.user.email}</div>
                            {t.user.name && <div className="text-xs text-muted-foreground">{t.user.name}</div>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">用户ID: {t.user_id}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={actionColors[t.action]}>{actionLabels[t.action]}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={t.amount > 0 ? "text-green-600" : "text-red-600"}>
                          {formatAmount(t.amount)}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold text-primary">{t.balance}</td>
                      <td className="px-3 py-2 max-w-xs truncate">{t.description}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleString()}
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
