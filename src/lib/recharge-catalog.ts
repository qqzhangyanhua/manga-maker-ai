/**
 * 充值套餐的唯一出处。纯数据，不含服务端依赖，充值弹窗可以直接引用。
 * 金额用整数分，避免用元做浮点存储。
 */

export interface RechargePlan {
  id: string;
  name: string;
  credits: number;
  /** 价格，单位：分 */
  priceFen: number;
  bonus?: number;
  /** 为 true 时弹窗显示「推荐」 */
  popular?: boolean;
}

const RECHARGE_PLANS: readonly RechargePlan[] = [
  { id: "basic", name: "基础套餐", credits: 5000, priceFen: 990 },
  {
    id: "standard",
    name: "标准套餐",
    credits: 15000,
    priceFen: 2990,
    bonus: 1000,
    popular: true,
  },
  {
    id: "premium",
    name: "高级套餐",
    credits: 50000,
    priceFen: 9990,
    bonus: 5000,
  },
  {
    id: "ultimate",
    name: "至尊套餐",
    credits: 100000,
    priceFen: 19990,
    bonus: 15000,
  },
];

export function listRechargePlans(): readonly RechargePlan[] {
  return RECHARGE_PLANS;
}

/** 未知标识返回空，不抛错。 */
export function getRechargePlan(id: string): RechargePlan | null {
  return RECHARGE_PLANS.find((plan) => plan.id === id) ?? null;
}

/**
 * 把整数分换成展示用的元。
 * 去掉末尾的 0，使 990 显示为 9.9 而不是 9.90，与原先弹窗一致。
 */
export function formatRechargePriceYuan(priceFen: number): string {
  const yuan = Math.trunc(priceFen / 100);
  const fen = Math.abs(priceFen % 100);
  if (fen === 0) {
    return String(yuan);
  }
  if (fen % 10 === 0) {
    return `${yuan}.${fen / 10}`;
  }
  return `${yuan}.${String(fen).padStart(2, "0")}`;
}
