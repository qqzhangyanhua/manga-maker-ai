# 💡 灵感模式功能实施计划

## 📋 功能概述

**灵感模式**：通过 AI 对话式引导，帮助用户从零开始构建故事雏形。

### 核心价值
- 🎯 解决"没有头绪"的创作困境
- 💬 对话式交互，降低创作门槛
- 🧠 AI 引导式提问，激发创意
- 📝 自动生成项目基础设定

---

## 🎨 功能设计

### 对话流程设计

```
步骤 1: 故事类型
AI: "你想写什么类型的故事？"
选项: 玄幻 / 科幻 / 现代 / 悬疑 / 言情 / 其他

步骤 2: 核心主题
AI: "这个故事的核心主题是什么？比如：复仇、成长、爱情、探索..."
用户: [自由输入]

步骤 3: 主角设定
AI: "主角是什么样的人？"
引导: 性别、年龄、职业、性格特点
用户: [自由输入]

步骤 4: 故事背景
AI: "故事发生在什么时代/地点？"
用户: [自由输入]

步骤 5: 核心冲突
AI: "主角面临的最大挑战是什么？"
用户: [自由输入]

步骤 6: 故事走向
AI: "你希望故事如何发展？"
选项: 热血成长 / 悬疑推理 / 情感纠葛 / 冒险探索

步骤 7: 生成雏形
AI: 根据以上信息，生成：
- 项目标题建议（3 个）
- 故事简介（200 字）
- 主角卡片
- 世界观框架
- 章节大纲（10 章）
```

---

## 🛠️ 技术实现

### 1. 后端实现

#### 数据结构
```python
class InspirationSession:
    """灵感模式对话会话"""
    session_id: str
    user_id: str
    current_step: int  # 当前步骤（1-7）
    answers: dict      # 用户回答
    created_at: datetime
```

#### API 设计

```python
# 1. 开始灵感模式
POST /inspiration/start
Response: {
    "session_id": "uuid",
    "step": 1,
    "question": "你想写什么类型的故事？",
    "options": ["玄幻", "科幻", "现代", "悬疑", "言情", "其他"]
}

# 2. 提交答案并获取下一个问题
POST /inspiration/next
Request: {
    "session_id": "uuid",
    "answer": "科幻"
}
Response: {
    "step": 2,
    "question": "这个故事的核心主题是什么？",
    "hint": "比如：探索未知、人工智能觉醒、星际战争..."
}

# 3. 生成故事雏形
POST /inspiration/generate
Request: {
    "session_id": "uuid"
}
Response: {
    "title_suggestions": ["星际迷航", "机械觉醒", "未来之城"],
    "description": "在2157年的地球...",
    "protagonist": {
        "name": "建议名称",
        "description": "..."
    },
    "world_setting": {...},
    "outline": [...]
}

# 4. 创建项目（基于灵感模式结果）
POST /inspiration/create-project
Request: {
    "session_id": "uuid",
    "selected_title": "星际迷航"
}
Response: {
    "project_id": "uuid"
}
```

---

### 2. 前端实现

#### 组件结构
```
InspirationModeDialog.tsx (主对话框)
├── InspirationStep.tsx (单个步骤)
├── InspirationResult.tsx (生成结果展示)
└── InspirationLoading.tsx (生成中动画)
```

#### 界面设计

```
┌─────────────────────────────────────────┐
│  💡 灵感模式 - 步骤 2/7                 │
├─────────────────────────────────────────┤
│                                         │
│  🤖 AI: 这个故事的核心主题是什么？      │
│                                         │
│  💡 提示：比如探索未知、人工智能觉醒... │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ [用户输入框]                      │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [上一步]              [下一步 →]      │
└─────────────────────────────────────────┘
```

#### 生成结果界面

```
┌─────────────────────────────────────────┐
│  ✨ 故事雏形已生成                      │
├─────────────────────────────────────────┤
│                                         │
│  📖 标题建议（选择一个）                │
│  ○ 星际迷航                            │
│  ○ 机械觉醒                            │
│  ○ 未来之城                            │
│                                         │
│  📝 故事简介                            │
│  在2157年的地球，人类已经...           │
│                                         │
│  👤 主角                                │
│  姓名：林晨                             │
│  描述：25岁，星际飞行员...             │
│                                         │
│  🌍 世界观                              │
│  - 地点：地球联邦空间站                │
│  - 时代：2157年                        │
│                                         │
│  📚 章节大纲（10章）                    │
│  第1章：启程                            │
│  第2章：初遇                            │
│  ...                                    │
│                                         │
│  [重新生成]        [创建项目 →]        │
└─────────────────────────────────────────┘
```

---

## 📦 实施步骤

### Phase 1: 后端服务（1.5 小时）

#### 1.1 创建灵感模式服务
**文件**: `services/novel-backend/app/services/inspiration_service.py`

```python
class InspirationService:
    """灵感模式服务"""
    
    QUESTIONS = [
        {
            "step": 1,
            "question": "你想写什么类型的故事？",
            "type": "choice",
            "options": ["玄幻", "科幻", "现代", "历史", "悬疑", "言情", "武侠", "奇幻"]
        },
        {
            "step": 2,
            "question": "这个故事的核心主题是什么？",
            "type": "text",
            "hint": "比如：复仇、成长、爱情、探索、正义..."
        },
        # ... 更多问题
    ]
    
    async def start_session(self, user_id: str) -> dict:
        """开始新的灵感会话"""
        
    async def get_next_question(self, session_id: str, answer: str) -> dict:
        """提交答案并获取下一个问题"""
        
    async def generate_story_draft(self, session_id: str) -> dict:
        """根据对话生成故事雏形"""
```

#### 1.2 创建 API 路由
**文件**: `services/novel-backend/app/routers/inspiration.py`

```python
router = APIRouter(prefix="/inspiration", tags=["inspiration"])

@router.post("/start")
async def start_inspiration_mode(...)

@router.post("/next")
async def submit_answer_and_next(...)

@router.post("/generate")
async def generate_story_draft(...)

@router.post("/create-project")
async def create_project_from_inspiration(...)
```

#### 1.3 注册路由
**文件**: `services/novel-backend/app/main.py`

```python
from .routers import inspiration
app.include_router(inspiration.router, prefix="/api")
```

---

### Phase 2: 前端组件（2 小时）

#### 2.1 创建主对话框组件
**文件**: `src/app/(novel)/novel/components/InspirationModeDialog.tsx`

```tsx
export function InspirationModeDialog({
  isOpen,
  onClose,
  onProjectCreated
}: InspirationModeDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<StoryDraft | null>(null);
  
  // ... 实现逻辑
}
```

#### 2.2 集成到项目列表页
**文件**: `src/app/(novel)/novel/page.tsx`

```tsx
// 添加"灵感模式"按钮
<Button onClick={() => setIsInspirationModeOpen(true)}>
  <Sparkles className="mr-2 h-4 w-4" />
  灵感模式
</Button>

<InspirationModeDialog
  isOpen={isInspirationModeOpen}
  onClose={() => setIsInspirationModeOpen(false)}
  onProjectCreated={(projectId) => {
    router.push(`/novel/${projectId}`);
  }}
/>
```

---

### Phase 3: AI Prompt 优化（0.5 小时）

#### 生成故事雏形的 Prompt

```python
system_prompt = """你是一位专业的故事策划师，擅长根据用户的创意构建完整的故事框架。

任务：根据用户提供的信息，生成一个完整的故事雏形。

要求：
1. 标题要吸引人，符合类型特点
2. 简介要简洁有力，突出核心冲突
3. 主角要有鲜明特点
4. 世界观要合理自洽
5. 大纲要有起承转合

输出格式：严格按照 JSON 格式输出
{
  "title_suggestions": ["标题1", "标题2", "标题3"],
  "description": "故事简介（200字）",
  "protagonist": {
    "name": "建议名称",
    "role": "角色定位",
    "description": "详细描述",
    "traits": ["特点1", "特点2"]
  },
  "world_setting": {
    "locations": [...],
    "rules": [...],
    "timeline": [...]
  },
  "outline": [
    {
      "chapter_number": 1,
      "title": "章节标题",
      "outline": "章节大纲",
      "key_events": [...]
    }
  ]
}
"""
```

---

## 🎯 工作量评估

| 阶段 | 任务 | 工作量 |
|------|------|--------|
| Phase 1 | 后端服务 + API | 1.5h |
| Phase 2 | 前端组件 + 集成 | 2h |
| Phase 3 | Prompt 优化 | 0.5h |
| **总计** | | **4h** |

---

## ✅ 验收标准

### 功能验收
- [ ] 能够开始灵感模式对话
- [ ] 能够逐步回答问题（7 个步骤）
- [ ] 能够生成故事雏形
- [ ] 生成结果包含：标题建议、简介、主角、世界观、大纲
- [ ] 能够基于结果创建项目
- [ ] 创建的项目自动填充所有信息

### 体验验收
- [ ] 对话流程自然流畅
- [ ] AI 引导清晰有效
- [ ] 生成结果质量高
- [ ] 界面美观易用
- [ ] 生成时间 < 60 秒

---

## 🚀 优化方向

### 未来增强
1. **多轮对话优化**
   - 根据用户回答动态调整问题
   - 追问细节，深化设定

2. **模板系统**
   - 预设经典故事模板
   - 用户可选择模板快速开始

3. **灵感库**
   - 保存历史灵感会话
   - 可以回顾和复用

4. **协作模式**
   - 多人协作构建故事
   - 实时同步灵感

---

## 📝 使用场景示例

### 场景 1: 新手作者
```
用户: "我想写小说，但不知道从哪开始..."
系统: [打开灵感模式]
AI: "你想写什么类型的故事？"
用户: "科幻"
AI: "这个故事的核心主题是什么？"
用户: "人工智能觉醒"
...
[7 步对话后]
系统: 生成完整的故事雏形
用户: [选择标题] → 创建项目 → 开始创作
```

### 场景 2: 有想法但不完整
```
用户: "我有个想法，但不知道怎么展开..."
系统: [打开灵感模式]
AI: 通过引导式提问，帮助用户完善设定
系统: 生成完整框架
用户: 基于框架开始创作
```

---

## 🎁 预期效果

### 实施前
- ❌ 新手用户不知道如何开始
- ❌ 需要手动填写大量信息
- ❌ 创作门槛高

### 实施后
- ✅ AI 引导式创作，降低门槛
- ✅ 7 步对话快速构建框架
- ✅ 自动生成完整设定
- ✅ 新手友好，专业实用

---

**完成后，项目完成度**: 98% → **99%** 🚀
