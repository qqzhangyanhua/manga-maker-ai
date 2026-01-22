# 依赖安装问题解决方案

## 问题
```
Module not found: Can't resolve '@asteasolutions/zod-to-openapi'
```

## 原因
`node_modules` 目录不完整，缺少 `@asteasolutions/zod-to-openapi` 包。

## 解决方案

由于 npm 在此环境中存在问题（`Cannot read properties of null`），使用 **pnpm** 安装依赖：

```bash
pnpm install
```

## 验证

包已成功安装在：
```
node_modules/@asteasolutions/zod-to-openapi/
```

## 下一步

重新启动开发服务器：
```bash
npm run dev
```

现在应该可以正常运行，没有模块未找到的错误。

---

## 备注

- 项目 `package.json` 中已经包含 `@asteasolutions/zod-to-openapi: ^7.3.0`
- pnpm 安装了版本 `7.3.4`
- 所有依赖已正确安装并可用
