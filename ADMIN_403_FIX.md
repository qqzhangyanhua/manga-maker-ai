# 管理后台 403 错误 - 解决方案

## 问题诊断

访问 `/admin/comic-styles` 返回 403 错误，原因是当前用户**没有管理员权限**。

---

## 快速解决方案

### 方案 1：使用管理员账号登录（推荐）

系统中已有管理员账号：**yanz57213@gmail.com**

**步骤**：
1. 退出当前登录（点击右上角"退出"）
2. 使用 `yanz57213@gmail.com` 登录
3. 访问 `/admin/comic-styles`

---

### 方案 2：将当前账号升级为管理员

如果你想用 `939593210@qq.com` 访问管理后台：

```bash
# 设置为管理员
npx tsx scripts/set-admin.ts 939593210@qq.com
```

**输出示例**：
```
🎉 成功！用户 939593210@qq.com 已设置为管理员

用户信息：
  ID: 0b84f350-b112-42ab-bbad-58c2ae31f8c3
  姓名: aaaaa
  角色: admin
  验证状态: 未验证

✅ 现在可以访问 /admin/comic-styles 了
   刷新浏览器页面重新登录以应用权限
```

**重要**：设置完后需要 **重新登录** 才能生效！

---

### 方案 3：直接用 SQL 设置（适用于紧急情况）

```sql
-- 设置指定用户为管理员
UPDATE users 
SET role = 'admin' 
WHERE email = '939593210@qq.com';

-- 或者设置所有已验证用户为管理员
UPDATE users 
SET role = 'admin' 
WHERE verified = true;
```

---

## 验证步骤

### 1. 确认当前登录用户

打开浏览器开发者工具 → Console，运行：

```javascript
fetch('/api/auth/me')
  .then(r => r.json())
  .then(data => console.log('当前用户:', data));
```

**期望输出**：
```json
{
  "id": "...",
  "email": "yanz57213@gmail.com",
  "role": "admin"  // ← 必须是 admin
}
```

### 2. 测试管理员权限

```bash
# 在终端测试（需要先登录并获取 token）
curl http://localhost:3000/api/admin/comic-styles \
  -H "Cookie: token=YOUR_TOKEN_HERE"
```

**成功响应** (200)：
```json
{
  "data": [...],
  "total": 6
}
```

**失败响应** (403)：
```json
{
  "error": "权限不足，需要管理员权限"
}
```

---

## 常用命令

### 查看所有用户

```bash
npx tsx scripts/set-admin.ts --list
```

**输出示例**：
```
📋 系统中的所有用户：

1. 👑 yanz57213@gmail.com
   角色: admin
   姓名: 111
   验证: ✅
   ID: 2e6eda84-e060-4e34-93ea-c0cb1506ed12

2. 👤 939593210@qq.com
   角色: user
   姓名: aaaaa
   验证: ❌
   ID: 0b84f350-b112-42ab-bbad-58c2ae31f8c3
```

### 设置任意用户为管理员

```bash
npx tsx scripts/set-admin.ts <email>
```

---

## 为什么会 403？

### 1. 未登录
- **症状**：返回 `{ "error": "未登录" }`
- **解决**：访问 `/auth/login` 登录

### 2. Token 无效
- **症状**：返回 `{ "error": "无效的 token" }`
- **解决**：清除浏览器 Cookie，重新登录

### 3. 不是管理员
- **症状**：返回 `{ "error": "权限不足，需要管理员权限" }`
- **解决**：使用上述方案设置管理员

---

## 权限检查逻辑

管理后台的权限检查代码（`src/app/api/admin/comic-styles/route.ts`）：

```typescript
async function checkAdmin() {
  // 1. 获取 token
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { authorized: false, error: "未登录" };

  // 2. 验证 token
  const payload = verifyAuthToken(token);
  if (!payload?.userId) return { authorized: false, error: "无效的 token" };

  // 3. 查询用户角色
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true },
  });

  // 4. 检查是否为 admin
  if (user?.role !== "admin") {
    return { authorized: false, error: "权限不足，需要管理员权限" };
  }

  return { authorized: true };
}
```

---

## 安全建议

### 生产环境

1. **不要随意设置管理员**
   - 只给信任的用户设置 admin 角色
   - 定期审计管理员列表

2. **增强安全性**
   - 启用双因素认证（未来功能）
   - 记录管理员操作日志

3. **限制访问**
   - 使用 IP 白名单
   - 配置 HTTPS

### 开发环境

可以创建一个测试管理员账号：

```bash
# 1. 注册新账号（在网页上操作）
# 2. 设置为管理员
npx tsx scripts/set-admin.ts test-admin@example.com
```

---

## 故障排查清单

- [ ] 确认已登录
- [ ] 确认使用的是管理员账号
- [ ] 确认 `role` 字段为 `admin`
- [ ] 清除浏览器 Cookie 后重新登录
- [ ] 检查浏览器开发者工具的 Network 标签
- [ ] 查看服务器日志是否有错误

---

## 快速测试

运行以下脚本测试完整流程：

```bash
# 1. 列出所有用户
npx tsx scripts/set-admin.ts --list

# 2. 设置当前用户为管理员（替换邮箱）
npx tsx scripts/set-admin.ts your@email.com

# 3. 启动开发服务器
pnpm dev

# 4. 访问管理后台
# http://localhost:3000/admin/comic-styles
```

---

## 相关文件

- `scripts/set-admin.ts` - 管理员设置工具
- `src/lib/auth.ts` - JWT 验证逻辑
- `src/app/api/admin/comic-styles/route.ts` - 权限检查代码

---

## 下一步

解决 403 问题后，你可以：

1. ✅ 访问管理后台查看风格列表
2. ✅ 新增自定义风格
3. ✅ 调整风格排序
4. ✅ 启用/禁用风格

**需要帮助？** 查看 [COMIC_STYLES_FEATURE.md](./COMIC_STYLES_FEATURE.md)
