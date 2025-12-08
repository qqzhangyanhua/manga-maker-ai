import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 从命令行参数获取邮箱，或使用默认邮箱
  const email = process.argv[2];

  if (!email) {
    console.error("❌ 请提供邮箱地址");
    console.log("\n使用方法：");
    console.log("  npx tsx scripts/set-admin.ts your@email.com");
    console.log("\n或者查看所有用户：");
    console.log("  npx tsx scripts/set-admin.ts --list");
    process.exit(1);
  }

  // 列出所有用户
  if (email === "--list" || email === "-l") {
    console.log("📋 系统中的所有用户：\n");
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        verified: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    });

    if (users.length === 0) {
      console.log("  暂无用户");
    } else {
      users.forEach((user, index) => {
        const roleEmoji = user.role === "admin" ? "👑" : "👤";
        const verifiedEmoji = user.verified ? "✅" : "❌";
        console.log(`${index + 1}. ${roleEmoji} ${user.email}`);
        console.log(`   角色: ${user.role || "user"}`);
        console.log(`   姓名: ${user.name || "未设置"}`);
        console.log(`   验证: ${verifiedEmoji}`);
        console.log(`   ID: ${user.id}`);
        console.log("");
      });
    }
    return;
  }

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`❌ 未找到邮箱为 ${email} 的用户`);
    console.log("\n💡 提示：运行以下命令查看所有用户");
    console.log("  npx tsx scripts/set-admin.ts --list");
    process.exit(1);
  }

  // 检查当前角色
  if (user.role === "admin") {
    console.log(`✅ 用户 ${email} 已经是管理员了`);
    console.log("\n用户信息：");
    console.log(`  ID: ${user.id}`);
    console.log(`  姓名: ${user.name || "未设置"}`);
    console.log(`  角色: ${user.role}`);
    console.log(`  验证状态: ${user.verified ? "已验证" : "未验证"}`);
    return;
  }

  // 更新为管理员
  const updated = await prisma.user.update({
    where: { email },
    data: { role: "admin" },
  });

  console.log(`🎉 成功！用户 ${email} 已设置为管理员\n`);
  console.log("用户信息：");
  console.log(`  ID: ${updated.id}`);
  console.log(`  姓名: ${updated.name || "未设置"}`);
  console.log(`  角色: ${updated.role}`);
  console.log(`  验证状态: ${updated.verified ? "已验证" : "未验证"}`);
  console.log("\n✅ 现在可以访问 /admin/comic-styles 了");
  console.log("   刷新浏览器页面重新登录以应用权限");
}

main()
  .catch((e) => {
    console.error("❌ 操作失败:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
