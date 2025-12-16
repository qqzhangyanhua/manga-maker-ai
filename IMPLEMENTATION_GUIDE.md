## 角色漫画风格功能实现指南

### 数据库迁移

**重要**：在使用前需要先执行数据库迁移。请连接到 PostgreSQL 数据库并执行：

```sql
-- 位置：prisma/migrations/manual_add_comic_style_field.sql

ALTER TABLE "characters"
ADD COLUMN IF NOT EXISTS "comic_style_id" UUID;

CREATE INDEX IF NOT EXISTS "idx_characters_comic_style"
ON "characters"("comic_style_id");

ALTER TABLE "characters"
ADD CONSTRAINT "characters_comic_style_id_fkey"
FOREIGN KEY ("comic_style_id")
REFERENCES "comic_styles"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
```

### API 使用示例

#### 1. 获取漫画风格列表

```typescript
const response = await fetch("/api/comic-styles");
const { data: styles } = await response.json();
```

#### 2. 创建带风格的角色

```typescript
const response = await fetch("/api/character", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "角色名称",
    description: "角色描述",
    comic_style_id: "风格ID", // 可选
  }),
});
```

#### 3. 更新角色风格

```typescript
const response = await fetch(`/api/character/${characterId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    comic_style_id: "新风格ID", // 或 null 取消风格
  }),
});
```

#### 4. 按风格筛选角色

```typescript
// 获取特定风格的角色
const response = await fetch(`/api/character?style_id=${styleId}`);

// 获取无风格的角色
const response = await fetch("/api/character?style_id=null");

// 获取所有角色（不筛选）
const response = await fetch("/api/character");
```

### 前端组件更新要点

#### CharacterLibrary 组件

需要添加：
1. 风格列表状态：`const [styles, setStyles] = useState<ComicStyle[]>([])`
2. 选中风格状态：`const [selectedStyle, setSelectedStyle] = useState<string | null>(null)`
3. 获取风格列表的 useEffect
4. 根据选中风格筛选角色的逻辑

#### 风格筛选 UI

建议添加在角色库标题下方，样式参考 /admin/comic-styles 页面：

```tsx
<div className="flex gap-2 overflow-x-auto pb-2">
  <button
    onClick={() => setSelectedStyle(null)}
    className={`px-4 py-2 rounded-lg ${
      !selectedStyle ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-300"
    }`}
  >
    全部
  </button>
  {styles.map((style) => (
    <button
      key={style.id}
      onClick={() => setSelectedStyle(style.id)}
      className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
        selectedStyle === style.id
          ? "bg-orange-500 text-white"
          : "bg-zinc-800 text-zinc-300"
      }`}
    >
      <img src={style.image_url} alt={style.name_zh} className="w-6 h-6 rounded" />
      {style.name_zh}
    </button>
  ))}
</div>
```

#### 角色卡片显示风格

在角色卡片中添加风格标签（Status Badge 下方）：

```tsx
{character.comic_style && (
  <div className="absolute top-14 right-3">
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${character.comic_style.tag_color}`}>
      {character.comic_style.name_en}
    </span>
  </div>
)}
```

#### CreateCharacterDialog 风格选择

添加风格选择下拉框：

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// 在组件中
const [styles, setStyles] = useState<ComicStyle[]>([]);

useEffect(() => {
  fetch("/api/comic-styles")
    .then((res) => res.json())
    .then((data) => setStyles(data.data));
}, []);

// 在表单中
<div className="space-y-2">
  <Label>漫画风格（可选）</Label>
  <Select
    value={comicStyleId}
    onValueChange={setComicStyleId}
  >
    <SelectTrigger>
      <SelectValue placeholder="选择风格" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="">无风格</SelectItem>
      {styles.map((style) => (
        <SelectItem key={style.id} value={style.id}>
          {style.name_zh} ({style.name_en})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### 类型定义

```typescript
interface ComicStyle {
  id: string;
  style_key: string;
  name_zh: string;
  name_en: string;
  image_url: string;
  tag_color: string;
  description: string | null;
  prompt_prefix: string | null;
  sort_order: number;
  usage_count: number;
}

interface CharacterAsset {
  id: string;
  name: string;
  description: string | null;
  base_image_url: string | null;
  tags: string[];
  training_status: "pending" | "training" | "ready" | "failed";
  usage_count: number;
  comic_style?: ComicStyle | null;
  views?: CharacterView[];
  expressions?: CharacterExpression[];
  outfits?: CharacterOutfit[];
}
```

### 待实现功能

1. **根据风格生成角色** - 需要集成 AI 图像生成 API，利用风格的 `prompt_prefix` 生成符合风格的角色图像
2. **类型检查** - 执行 `pnpm type-check` 修复可能的类型错误

### 注意事项

1. 数据库迁移必须先执行，否则 Prisma 查询会失败
2. 确保 comic_styles 表中有数据（可通过管理后台添加）
3. 旧角色的 `comic_style_id` 为 NULL，需要手动设置风格
4. 删除风格时不会删除角色，只会将角色的 `comic_style_id` 设为 NULL

### 测试步骤

1. 执行数据库迁移 SQL
2. 在管理后台(/admin/comic-styles)创建至少一个风格
3. 刷新角色库页面，应该能看到风格筛选器
4. 创建新角色时选择风格
5. 测试按风格筛选功能
