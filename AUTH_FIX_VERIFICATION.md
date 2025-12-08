# 权限认证问题修复 - 验证指南

## 🐛 问题根因

**Cookie 名称不匹配**：
- ✅ 登录时设置的 Cookie 名称：`comicai_session`
- ❌ 管理后台读取的 Cookie 名称：`token`

结果导致管理后台 API 无法读取到登录 token，返回 401/403 错误。

---

## ✅ 已修复的文件

1. `src/app/api/admin/comic-styles/route.ts`
2. `src/app/api/admin/comic-styles/[id]/route.ts`

**修改内容**：
```typescript
// 修复前 ❌
const token = cookieStore.get("token")?.value;

// 修复后 ✅
import { AUTH_COOKIE_NAME } from "@/lib/auth";
const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
```

---

## 🧪 验证步骤

### 1. 重启开发服务器

```bash
# 停止当前服务器（Ctrl+C）
# 重新启动
pnpm dev
```

### 2. 清除浏览器缓存并重新登录

**方法 A：使用无痕模式（推荐）**
```
Chrome: Ctrl+Shift+N (Win) / Cmd+Shift+N (Mac)
访问 http://localhost:3000/auth/login
```

**方法 B：清除 Cookie**
```
1. 打开开发者工具 (F12)
2. Application → Cookies → http://localhost:3000
3. 删除所有 Cookie
4. 刷新页面
```

### 3. 登录管理员账号

```
邮箱: yanz57213@gmail.com
密码: (你的密码)
```

### 4. 验证认证接口

**在浏览器开发者工具 Console 中运行**：

```javascript
// 1. 测试当前用户接口（应该返回 200）
fetch('/api/auth/me', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('✅ 当前用户:', data))
  .catch(err => console.error('❌ 错误:', err));

// 2. 测试管理后台接口（应该返回 200）
fetch('/api/admin/comic-styles', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('✅ 风格列表:', data))
  .catch(err => console.error('❌ 错误:', err));
```

**期望结果**：
```json
// /api/auth/me
{
  "success": true,
  "data": {
    "user": {
      "id": "2e6eda84-e060-4e34-93ea-c0cb1506ed12",
      "email": "yanz57213@gmail.com",
      "role": "admin"
    }
  }
}

// /api/admin/comic-styles
{
  "data": [...],
  "total": 6
}
```

### 5. 访问管理后台页面

```
http://localhost:3000/admin/comic-styles
```

**应该能看到**：
- ✅ 风格列表表格
- ✅ "新增风格" 按钮
- ✅ 操作按钮（编辑、删除、排序）

---

## 🔍 故障排查

### 问题 1：还是 401 错误

**检查 Cookie 是否正确设置**：

1. 打开开发者工具 → Application → Cookies
2. 查找 `comicai_session`
3. 确认：
   - ✅ Name: `comicai_session`
   - ✅ Value: 一长串 JWT token
   - ✅ Path: `/`
   - ✅ HttpOnly: ✓

**如果没有 Cookie**：
```bash
# 检查登录接口是否正常
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"yanz57213@gmail.com","password":"你的密码"}' \
  -v
```

查看响应头中是否有 `Set-Cookie: comicai_session=...`

### 问题 2：还是 403 错误

**确认用户角色**：
```javascript
fetch('/api/auth/me')
  .then(r => r.json())
  .then(data => {
    if (data.data.user.role !== 'admin') {
      console.error('❌ 当前用户不是管理员');
    } else {
      console.log('✅ 用户是管理员');
    }
  });
```

**如果不是管理员**：
```bash
npx tsx scripts/set-admin.ts yanz57213@gmail.com
```

### 问题 3：CORS 或跨域问题

如果你使用了代理或非标准端口：

```javascript
// 确保请求携带 credentials
fetch('/api/admin/comic-styles', {
  credentials: 'include',  // ← 重要！
  headers: {
    'Content-Type': 'application/json'
  }
});
```

---

## 📊 测试清单

- [ ] 登录成功后能看到 `comicai_session` Cookie
- [ ] `/api/auth/me` 返回 200 和用户信息
- [ ] `/api/admin/comic-styles` 返回 200 和风格列表
- [ ] `/admin/comic-styles` 页面正常加载
- [ ] 能够新增风格
- [ ] 能够编辑风格
- [ ] 能够删除风格
- [ ] 能够调整排序
- [ ] 能够切换启用/禁用

---

## 🚀 快速测试脚本

保存为 `test-auth.html` 并在浏览器中打开：

```html
<!DOCTYPE html>
<html>
<head>
  <title>认证测试</title>
  <style>
    body { font-family: monospace; padding: 20px; }
    button { margin: 10px; padding: 10px; }
    .success { color: green; }
    .error { color: red; }
    pre { background: #f5f5f5; padding: 10px; }
  </style>
</head>
<body>
  <h2>🧪 认证功能测试</h2>
  
  <button onclick="testMe()">1. 测试 /api/auth/me</button>
  <button onclick="testAdmin()">2. 测试 /api/admin/comic-styles</button>
  <button onclick="testCookie()">3. 检查 Cookie</button>
  
  <pre id="output"></pre>

  <script>
    const output = document.getElementById('output');
    
    async function testMe() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
          output.innerHTML = `<span class="success">✅ /api/auth/me 正常</span>\n${JSON.stringify(data, null, 2)}`;
        } else {
          output.innerHTML = `<span class="error">❌ 状态: ${res.status}</span>\n${JSON.stringify(data, null, 2)}`;
        }
      } catch (err) {
        output.innerHTML = `<span class="error">❌ 错误: ${err.message}</span>`;
      }
    }
    
    async function testAdmin() {
      try {
        const res = await fetch('/api/admin/comic-styles', { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
          output.innerHTML = `<span class="success">✅ /api/admin/comic-styles 正常</span>\n${JSON.stringify(data, null, 2)}`;
        } else {
          output.innerHTML = `<span class="error">❌ 状态: ${res.status}</span>\n${JSON.stringify(data, null, 2)}`;
        }
      } catch (err) {
        output.innerHTML = `<span class="error">❌ 错误: ${err.message}</span>`;
      }
    }
    
    function testCookie() {
      const cookies = document.cookie.split(';').map(c => c.trim());
      const comicaiSession = cookies.find(c => c.startsWith('comicai_session='));
      
      if (comicaiSession) {
        output.innerHTML = `<span class="success">✅ Cookie 存在</span>\n${comicaiSession}`;
      } else {
        output.innerHTML = `<span class="error">❌ 未找到 comicai_session Cookie</span>\n所有 Cookie:\n${document.cookie}`;
      }
    }
  </script>
</body>
</html>
```

---

## 📞 还需要帮助？

如果验证后还有问题，请提供：

1. 浏览器开发者工具的 Console 错误
2. Network 标签中的请求详情（Request/Response Headers）
3. Application → Cookies 的截图

---

## ✅ 预期结果

修复成功后，你应该能够：

1. ✅ 正常登录
2. ✅ `/api/auth/me` 返回用户信息
3. ✅ `/api/admin/comic-styles` 返回风格列表
4. ✅ 访问 `/admin/comic-styles` 看到管理界面
5. ✅ 进行所有管理操作（增删改查、排序、启用/禁用）

---

**修复完成时间**: 2024-12-08  
**问题类型**: Cookie 名称不匹配  
**影响范围**: 所有管理后台 API  
**修复方法**: 统一使用 `AUTH_COOKIE_NAME` 常量
