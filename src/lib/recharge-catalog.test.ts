import {
  formatRechargePriceYuan,
  getRechargePlan,
  listRechargePlans,
} from "./recharge-catalog";

describe("充值套餐目录", () => {
  it("列出既有四档套餐，金额以整数分保存，推荐标记只在标准档", () => {
    expect(listRechargePlans()).toEqual([
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
    ]);
  });

  it("按标识取到对应套餐", () => {
    expect(getRechargePlan("premium")).toEqual({
      id: "premium",
      name: "高级套餐",
      credits: 50000,
      priceFen: 9990,
      bonus: 5000,
    });
  });

  it("未知标识返回空", () => {
    expect(getRechargePlan("missing")).toBeNull();
  });

  it("展示时把整数分换算成与改动前一致的元", () => {
    expect(formatRechargePriceYuan(990)).toBe("9.9");
    expect(formatRechargePriceYuan(2990)).toBe("29.9");
    expect(formatRechargePriceYuan(9990)).toBe("99.9");
    expect(formatRechargePriceYuan(19990)).toBe("199.9");
  });
});
