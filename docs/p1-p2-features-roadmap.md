# P1 功能实施清单

## 优先级说明

**P1 = 高价值 + 中等成本**，建议 2-4 周内完成

---

## 1. AI 写作分析报告

**用户价值**: ⭐⭐⭐⭐⭐
**商业价值**: ⭐⭐⭐⭐⭐
**技术复杂度**: ⭐⭐⭐
**预计工时**: 5-7 天

### 功能描述
像 Grammarly 一样，但专门针对小说创作，提供：
- 故事节奏分析（章节长度分布、情节密度）
- 角色一致性检查（性格、行为、对话风格）
- 对话质量分析（占比、自然度、信息量）
- 场景描写评估（视觉化程度、细节丰富度）
- 词汇多样性分析
- 风格对比（与经典作品对比）

### 技术实现要点
```typescript
// 文本分析算法
interface TextAnalysisResult {
  rhythm: {
    pacing: 'fast' | 'medium' | 'slow';
    sentenceLength: number;
    paragraphLength: number;
    issues: string[];
  };
  dialogue: {
    ratio: number; // 对话占比
    quality: number;
    issues: string[];
  };
  characters: {
    consistency: number;
    issues: CharacterIssue[];
  };
  style: {
    vocabulary: number;
    sentenceVariety: number;
    similarWorks: string[];
  };
}
```

### 后端 API 需求
```
POST /api/novel/projects/{id}/analyze-writing
- 接收章节内容
- 调用 LLM 进行分析
- 返回结构化报告
```

---

## 2. 故事模板库

**用户价值**: ⭐⭐⭐⭐
**商业价值**: ⭐⭐⭐
**技术复杂度**: ⭐⭐
**预计工时**: 3-5 天

### 功能描述
提供预设的故事结构模板，降低创作门槛：

**模板分类**:
- **按类型**: 玄幻修真、西方奇幻、都市言情、悬疑推理、科幻未来、武侠江湖
- **按结构**: 三幕式、五幕式、英雄之旅、时间循环、群像剧
- **按特色**: 爽文模板、智斗推理、轻松搞笑、治愈系

**模板内容**:
```typescript
interface StoryTemplate {
  id: string;
  name: string;
  category: string;
  structure: {
    actCount: number;
    acts: {
      name: string;
      chapterCount: number;
      description: string;
      keyPoints: string[];
      suggestedLength: number; // 字数
    }[];
  };
  characterArchetypes: string[];
  commonTropes: string[];
  writingTips: string[];
  examples: string[];
}
```

### 示例模板
```typescript
const xuanhuanTemplate: StoryTemplate = {
  id: 'xuanhuan-3-act',
  name: '玄幻修真 - 三幕式',
  category: '玄幻',
  structure: {
    actCount: 3,
    acts: [
      {
        name: '第一幕：初入仙途',
        chapterCount: 10,
        description: '主角发现修炼天赋，拜入宗门，初露锋芒',
        keyPoints: ['金手指觉醒', '拜师学艺', '初试牛刀', '引起注意'],
        suggestedLength: 30000,
      },
      {
        name: '第二幕：历练成长',
        chapterCount: 20,
        description: '外出历练，遭遇挫折，突破瓶颈，建立势力',
        keyPoints: ['探索秘境', '结交好友', '生死危机', '境界突破'],
        suggestedLength: 60000,
      },
      {
        name: '第三幕：巅峰对决',
        chapterCount: 10,
        description: '面对最终敌人，揭示真相，飞升成仙',
        keyPoints: ['最终决战', '真相揭露', '尘埃落定', '新的开始'],
        suggestedLength: 30000,
      },
    ],
  },
  characterArchetypes: ['废柴逆袭型', '天才高冷型', '神秘转世型'],
  commonTropes: ['退婚流', '宗门大比', '秘境探险', '拍卖会'],
  writingTips: [
    '前期节奏要快，快速吸引读者',
    '中期要有波折，避免平铺直叙',
    '后期高潮迭起，情感升华',
  ],
  examples: ['《斗破苍穹》', '《凡人修仙传》'],
};
```

---

## 3. React Query 数据缓存

**用户价值**: ⭐⭐⭐
**商业价值**: ⭐⭐
**技术复杂度**: ⭐⭐
**预计工时**: 2-3 天

### 功能描述
替换当前的 `useNovelProject` Hook，引入 React Query 提供：
- 自动数据缓存
- 后台自动刷新
- 乐观更新支持
- 减少网络请求

### 实现示例
```typescript
// hooks/useNovelProjectQuery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useNovelProject(projectId: string) {
  const queryClient = useQueryClient();

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['novel-project', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/novel/projects/${projectId}`);
      if (!res.ok) throw new Error('获取项目失败');
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5分钟
    gcTime: 1000 * 60 * 30, // 30分钟
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NovelProject>) => {
      const res = await fetch(`/api/novel/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('更新失败');
      return res.json();
    },
    onSuccess: (data) => {
      // 乐观更新：直接更新缓存
      queryClient.setQueryData(['novel-project', projectId], data);
    },
    onSettled: () => {
      // 重新验证确保数据一致性
      queryClient.invalidateQueries({ queryKey: ['novel-project', projectId] });
    },
  });

  return {
    project,
    isLoading,
    error,
    updateProject: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
```

---

## 4. 代码分割优化

**用户价值**: ⭐⭐⭐
**商业价值**: ⭐
**技术复杂度**: ⭐⭐
**预计工时**: 2 天

### 功能描述
使用 Next.js 动态导入减少初始包大小

### 实施计划
```typescript
// 当前：同步导入
import { OutlineEditor } from './components/OutlineEditor';
import { CharacterManager } from './components/CharacterManager';
import { WorldSettingEditor } from './components/WorldSettingEditor';

// 改进：动态导入 + Suspense
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const OutlineEditor = lazy(() => import('./components/OutlineEditor'));
const CharacterManager = lazy(() => import('./components/CharacterManager'));
const WorldSettingEditor = lazy(() => import('./components/WorldSettingEditor'));

// 使用
<TabsContent value="outline">
  <Suspense fallback={<Skeleton className="h-[600px]" />}>
    <OutlineEditor {...props} />
  </Suspense>
</TabsContent>
```

---

## 5. 搜索功能增强

**用户价值**: ⭐⭐⭐⭐
**商业价值**: ⭐⭐
**技术复杂度**: ⭐⭐
**预计工时**: 3-4 天

### 功能描述
增强现有搜索对话框，支持：
- 全文搜索（标题、大纲、内容）
- 模糊搜索
- 高级筛选（按状态、角色、时间段）
- 搜索结果高亮

### API 设计
```
POST /api/novel/projects/{id}/search
Body: {
  query: string;
  scope: 'title' | 'outline' | 'content' | 'all';
  filters: {
    status?: 'draft' | 'completed';
    characterIds?: string[];
    dateRange?: { start: Date; end: Date };
  };
}
Response: {
  results: SearchResult[];
  total: number;
  highlights: { [chapterId: string]: string[] };
}
```

---

## 6. 导出功能增强

**用户价值**: ⭐⭐⭐⭐⭐
**商业价值**: ⭐⭐⭐
**技术复杂度**: ⭐⭐⭐
**预计工时**: 4-6 天

### 功能描述
支持多种格式导出和平台对接

**导出格式**:
- PDF（带封面、目录）
- EPUB（电子书格式）
- DOCX（Word 文档）
- TXT（纯文本）
- Markdown

**平台对接**（可选，长期）:
- 起点中文网
- 晋江文学城
- 纵横中文网
- Lofter
- 微信读书

---

## 7. 协作编辑支持

**用户价值**: ⭐⭐⭐⭐
**商业价值**: ⭐⭐⭐⭐
**技术复杂度**: ⭐⭐⭐⭐
**预计工时**: 7-10 天

### 功能描述
支持多人协作编辑同一项目

**核心功能**:
- 项目共享（邀请协作者）
- 实时编辑锁定
- 评论和批注
- 变更历史追踪
- 冲突解决

### 技术方案
- 使用 WebSocket 实现实时同步
- 使用 Yjs 或 Automerge 处理冲突
- 使用 Supabase Realtime 或 Firebase Realtime Database

---

## 8. 移动端优化

**用户价值**: ⭐⭐⭐⭐
**商业价值**: ⭐⭐⭐
**技术复杂度**: ⭐⭐⭐
**预计工时**: 5-7 天

### 功能描述
优化移动端体验

**优化点**:
- 响应式布局优化
- 触摸手势支持（滑动切换章节）
- 移动端专属编辑器
- 离线编辑支持
- 推送通知

---

## 🟢 P2 功能（中期规划）

## 9. 角色关系图谱可视化

**预计工时**: 5-7 天

自动从章节内容提取角色关系，生成交互式关系图

---

## 10. AI 对话调试模式

**预计工时**: 7-10 天

允许用户与 AI 对话，调整生成参数

---

## 11. 创作挑战系统

**预计工时**: 5-7 天

游戏化激励，每日任务、成就徽章

---

## 12. 一键发布对接

**预计工时**: 10-14 天

打通创作到发布的完整链路

---

## 🔵 P3 功能（长期演进）

## 13. 离线编辑 + 冲突解决

## 14. 事件溯源（版本历史增强）

## 15. A/B 测试框架

---

## 🎯 推荐实施顺序

### 第 1 周
1. **React Query 数据缓存** - 提升性能，减少开发复杂度
2. **搜索功能增强** - 立即提升用户体验

### 第 2 周
3. **故事模板库** - 降低门槛，吸引新用户
4. **代码分割优化** - 提升加载速度

### 第 3-4 周
5. **AI 写作分析报告** - 差异化功能，提升留存
6. **导出功能增强** - 完善核心功能链路

---

## 💬 请问您想要：

1. **立即实施某个 P1 功能** - 告诉我具体是哪个
2. **查看某个功能的详细设计** - 我可以展开设计文档
3. **其他需求** - 请描述您的具体需求

我可以立即开始实施！
