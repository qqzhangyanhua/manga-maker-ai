# 漫画风格列表导出功能

## 功能概述

为漫画风格管理页面添加数据导出功能,支持导出为 JSON 和 CSV 两种格式,方便数据备份、迁移和分析。

## 功能特性

### 1. JSON 格式导出

**用途**: 数据备份、系统迁移、API 集成

**文件命名**: `comic-styles-YYYY-MM-DD.json`

**数据结构**:
```json
[
  {
    "id": "uuid",
    "style_key": "manga",
    "name_zh": "日式漫画",
    "name_en": "MANGA",
    "image_url": "https://...",
    "tag_color": "bg-primary text-background",
    "description": "经典的日式漫画风格",
    "prompt_prefix": "japanese manga style, anime art",
    "sort_order": 0,
    "enabled": true,
    "usage_count": 123,
    "created_at": "2026-01-17T10:00:00.000Z",
    "updated_at": "2026-01-17T12:00:00.000Z"
  }
]
```

**特点**:
- ✅ 完整的字段信息
- ✅ 保留原始数据类型
- ✅ 易于程序解析
- ✅ 支持数据导入
- ✅ 格式化输出(2 空格缩进)

### 2. CSV 格式导出

**用途**: Excel 分析、数据统计、报表生成

**文件命名**: `comic-styles-YYYY-MM-DD.csv`

**表头**:
```
ID,风格标识,中文名称,英文名称,图片URL,标签颜色,描述,AI提示词前缀,排序,启用状态,使用次数,创建时间,更新时间
```

**特点**:
- ✅ 支持 Excel 直接打开
- ✅ UTF-8 BOM 编码(避免中文乱码)
- ✅ 自动转义特殊字符(逗号、引号、换行)
- ✅ 时间格式本地化(中文格式)
- ✅ 启用状态中文显示(启用/禁用)

## 使用方法

### 导出 JSON

1. 进入漫画风格管理页面
2. 确保列表中有数据
3. 点击左上角"导出 JSON"按钮
4. 浏览器自动下载文件
5. 查看 Toast 提示"已导出 N 个风格"

### 导出 CSV

1. 进入漫画风格管理页面
2. 确保列表中有数据
3. 点击左上角"导出 CSV"按钮
4. 浏览器自动下载文件
5. 使用 Excel 或其他工具打开

## 技术实现

### JSON 导出逻辑

```typescript
const handleExportJSON = () => {
  // 1. 准备导出数据
  const exportData = styles.map((style) => ({
    id: style.id,
    style_key: style.style_key,
    name_zh: style.name_zh,
    name_en: style.name_en,
    image_url: style.image_url,
    tag_color: style.tag_color,
    description: style.description,
    prompt_prefix: style.prompt_prefix,
    sort_order: style.sort_order,
    enabled: style.enabled,
    usage_count: style.usage_count,
    created_at: style.created_at,
    updated_at: style.updated_at,
  }));

  // 2. 创建 Blob
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });

  // 3. 触发下载
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comic-styles-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // 4. 显示提示
  toast({ title: "导出成功", description: `已导出 ${styles.length} 个风格` });
};
```

### CSV 导出逻辑

```typescript
const handleExportCSV = () => {
  // 1. 定义表头
  const headers = [
    "ID", "风格标识", "中文名称", "英文名称", "图片URL",
    "标签颜色", "描述", "AI提示词前缀", "排序",
    "启用状态", "使用次数", "创建时间", "更新时间"
  ];

  // 2. 转换数据行
  const rows = styles.map((style) => [
    style.id,
    style.style_key,
    style.name_zh,
    style.name_en,
    style.image_url || "",
    style.tag_color,
    style.description || "",
    style.prompt_prefix || "",
    style.sort_order,
    style.enabled ? "启用" : "禁用",
    style.usage_count,
    style.created_at ? new Date(style.created_at).toLocaleString("zh-CN") : "",
    style.updated_at ? new Date(style.updated_at).toLocaleString("zh-CN") : "",
  ]);

  // 3. 转义特殊字符
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => {
        const cellStr = String(cell);
        // 包含逗号、引号或换行时用双引号包裹
        if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(",")
    ),
  ].join("\n");

  // 4. 添加 BOM(避免 Excel 中文乱码)
  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  // 5. 触发下载
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comic-styles-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // 6. 显示提示
  toast({ title: "导出成功", description: `已导出 ${styles.length} 个风格` });
};
```

## UI 布局

### 按钮位置

```
┌─────────────────────────────────────────────────────┐
│  [批量生成] [导出JSON] [导出CSV]    [新增风格]   │
└─────────────────────────────────────────────────────┘
    ↑ 左侧功能区                         ↑ 右侧主操作
```

### 显示条件

```typescript
{styles.length > 0 && (
  <div className="flex items-center gap-2">
    <Button onClick={handleExportJSON}>
      <Download className="w-4 h-4 mr-2" />
      导出 JSON
    </Button>
    <Button onClick={handleExportCSV}>
      <Download className="w-4 h-4 mr-2" />
      导出 CSV
    </Button>
  </div>
)}
```

只有当列表中有数据时才显示导出按钮。

## 数据字段说明

| 字段 | 类型 | 说明 | JSON | CSV |
|------|------|------|------|-----|
| id | string | UUID 主键 | ✅ | ✅ |
| style_key | string | 风格唯一标识 | ✅ | ✅ |
| name_zh | string | 中文名称 | ✅ | ✅ |
| name_en | string | 英文名称 | ✅ | ✅ |
| image_url | string | 图片 URL | ✅ | ✅ |
| tag_color | string | 标签颜色类名 | ✅ | ✅ |
| description | string | 描述 | ✅ | ✅ |
| prompt_prefix | string | AI 提示词前缀 | ✅ | ✅ |
| sort_order | number | 排序权重 | ✅ | ✅ |
| enabled | boolean | 启用状态 | ✅ | ✅ (中文) |
| usage_count | number | 使用次数 | ✅ | ✅ |
| created_at | timestamp | 创建时间 | ✅ | ✅ (本地化) |
| updated_at | timestamp | 更新时间 | ✅ | ✅ (本地化) |

## 应用场景

### 场景 1: 数据备份

```
定期导出 JSON 文件作为备份:
1. 每周导出一次完整数据
2. 保存到云存储或本地
3. 发生问题时可快速恢复
```

### 场景 2: 系统迁移

```
从测试环境迁移到生产环境:
1. 测试环境导出 JSON
2. 编辑 JSON 文件(如修改图片 URL)
3. 生产环境导入数据
```

### 场景 3: 数据分析

```
导出 CSV 用于数据分析:
1. 导出 CSV 文件
2. 在 Excel 中打开
3. 创建数据透视表
4. 分析使用趋势和热门风格
```

### 场景 4: 报表生成

```
生成风格使用报告:
1. 导出 CSV 文件
2. 按使用次数排序
3. 生成 Top 10 风格报表
4. 分享给团队
```

## 注意事项

### 1. 文件编码

- **JSON**: UTF-8 无 BOM
- **CSV**: UTF-8 with BOM (避免 Excel 乱码)

### 2. 特殊字符处理

CSV 导出时自动处理:
- 逗号: 用双引号包裹
- 双引号: 转义为两个双引号 `""`
- 换行符: 用双引号包裹

### 3. 空值处理

- **JSON**: 保留 `null` 值
- **CSV**: 转换为空字符串 `""`

### 4. 时间格式

- **JSON**: ISO 8601 格式 `2026-01-17T10:00:00.000Z`
- **CSV**: 本地化格式 `2026/1/17 10:00:00`

### 5. 浏览器兼容性

所有现代浏览器均支持:
- Blob API
- URL.createObjectURL
- 自动下载

## 扩展功能

### 可能的改进方向

1. **导入功能**: 支持导入 JSON 文件批量创建风格
2. **选择导出**: 支持勾选特定风格导出
3. **Excel 格式**: 导出 .xlsx 格式(需要库支持)
4. **导出模板**: 提供空白模板供填写
5. **导出设置**: 自定义导出字段
6. **压缩导出**: 大量数据时压缩为 ZIP

## 测试检查清单

- [ ] JSON 导出文件格式正确
- [ ] CSV 导出文件格式正确
- [ ] CSV 在 Excel 中无乱码
- [ ] 文件名包含正确日期
- [ ] 特殊字符正确转义
- [ ] 空值正确处理
- [ ] 时间格式正确
- [ ] Toast 提示显示正确
- [ ] 按钮仅在有数据时显示
- [ ] 下载后自动清理 URL

---

**最后更新**: 2026-01-17  
**维护者**: AI Coding Assistant
