/**
 * 交易历史管理相关类型定义
 */

export type CreditAction = "register" | "consume" | "recharge" | "admin_adjust" | "refund";

export type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  balance: number;
  action: CreditAction;
  description: string;
  ref_type: string | null;
  ref_id: string | null;
  created_at: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
};

export type TransactionListResponse = {
  success: boolean;
  data: {
    transactions: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  };
};

export const actionLabels: Record<CreditAction, string> = {
  register: "注册赠送",
  consume: "消耗",
  recharge: "充值",
  admin_adjust: "管理员调整",
  refund: "退款",
};

export const actionColors: Record<CreditAction, string> = {
  register: "text-green-600",
  consume: "text-red-600",
  recharge: "text-blue-600",
  admin_adjust: "text-purple-600",
  refund: "text-orange-600",
};
