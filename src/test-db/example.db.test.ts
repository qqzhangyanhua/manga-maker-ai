import { describe, expect, it } from "vitest";
import { db } from "./harness";

const sharedEmail = "test-db-read-write@example.com";

describe("test:db 示例读写", () => {
  it("写入用户后能按邮箱读回", async () => {
    const created = await db.user.create({
      data: { email: sharedEmail },
    });

    const found = await db.user.findUnique({ where: { email: sharedEmail } });
    expect(found?.id).toBe(created.id);
    expect(found?.email).toBe(sharedEmail);
  });

  it("上一个测试回滚后，同一邮箱不再存在，本测试仍能写入并读回", async () => {
    const leftover = await db.user.findUnique({ where: { email: sharedEmail } });
    expect(leftover).toBeNull();

    const created = await db.user.create({
      data: { email: sharedEmail },
    });
    const found = await db.user.findUnique({ where: { id: created.id } });
    expect(found?.email).toBe(sharedEmail);
  });
});
