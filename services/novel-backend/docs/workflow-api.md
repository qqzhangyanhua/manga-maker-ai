# 专业创作工作流 API 文档

## 概述

专业创作工作流是一个分阶段的小说创作辅助系统，通过 4 个核心阶段引导用户完成从创意构思到章节创作的全流程。

## 核心概念

### 工作流阶段

| 阶段 | 代码 | 描述 |
|------|------|------|
| 创意阶段 | `creative` | 确定创意方向和市场定位 |
| 设定阶段 | `setting` | 构建世界观和角色设定 |
| 框架阶段 | `framework` | 制作故事大纲和章节规划 |
| 创作阶段 | `writing` | 生成章节内容 |

### 会话状态

- `active`: 进行中
- `completed`: 已完成（已创建项目）
- `abandoned`: 已放弃
- 会话有效期：24 小时

---

## API 接口

### 1. 启动工作流

**POST** `/workflow/start`

创建新的工作流会话。

**请求体**
```json
{
  "genre": "玄幻小说"  // 可选，小说类型
}
```

**响应**
```json
{
  "session_id": "uuid",
  "current_phase": "creative",
  "completed_phases": [],
  "phase_info": {
    "order": 1,
    "display_name": "创意阶段",
    "description": "确定创意方向和市场定位"
  },
  "available_templates": [...],
  "workflow_phases": [...],
  "expires_at": "2024-01-01T00:00:00"
}
```

---

### 2. 获取会话状态

**GET** `/workflow/{session_id}`

获取当前工作流会话的详细状态。

**响应**
```json
{
  "session_id": "uuid",
  "current_phase": "setting",
  "completed_phases": ["creative"],
  "phase_info": {...},
  "phase_data": {...},
  "available_templates": [...],
  "project_id": null,
  "status": "active",
  "expires_at": "..."
}
```

---

### 3. 执行模板

**POST** `/workflow/{session_id}/execute`

使用指定模板生成内容。当 `input_data` 为空时，LLM 会自动生成示例内容供用户编辑。

**请求体**
```json
{
  "template_id": "uuid",      // 必填，模板 ID
  "input_data": {             // 可选，用户输入的变量
    "title": "作品标题",
    "protagonist": "主角设定"
  }
}
```

**响应**
```json
{
  "phase": "creative",
  "template_id": "uuid",
  "template_name": "玄幻小说-创意阶段-市场定位",
  "result": "LLM 生成的内容...",
  "parsed_result": {...}  // 如果是 JSON 格式，解析后的对象
}
```

---

### 4. 优化结果

**POST** `/workflow/{session_id}/optimize`

对当前阶段的生成结果进行 AI 优化。

**请求体**
```json
{
  "current_result": "当前的生成结果（用户可能已编辑）",
  "optimization_instruction": "让主角更有魅力"  // 可选
}
```

**响应**
```json
{
  "phase": "creative",
  "original_result": "优化前的内容",
  "optimized_result": "优化后的内容",
  "parsed_result": {...}
}
```

---

### 5. 进入下一阶段

**POST** `/workflow/{session_id}/next`

完成当前阶段，进入下一阶段。

**请求体**: 无

**响应（非最终阶段）**
```json
{
  "is_final": false,
  "current_phase": "setting",
  "phase_info": {
    "order": 2,
    "display_name": "设定阶段",
    "description": "构建世界观和角色设定"
  },
  "completed_phases": ["creative"],
  "available_templates": [...],
  "context_from_previous": {
    "project_brief": "上一阶段的输出内容..."
  }
}
```

**响应（最终阶段）**
```json
{
  "is_final": true,
  "message": "All phases completed. Ready to create project.",
  "session_id": "uuid"
}
```

---

### 6. 返回上一阶段

**POST** `/workflow/{session_id}/previous`

返回上一阶段进行编辑。

**请求体**: 无

**响应**
```json
{
  "current_phase": "creative",
  "phase_info": {...},
  "completed_phases": [],
  "available_templates": [...],
  "previous_input": {...},   // 之前填写的输入
  "previous_output": "..."   // 之前生成的输出
}
```

---

### 7. 完成工作流

**POST** `/workflow/{session_id}/complete`

完成工作流并创建小说项目。

**请求体**
```json
{
  "project_title": "逆天改命",           // 必填
  "project_description": "修仙少年的崛起之路"  // 可选
}
```

**响应**
```json
{
  "project_id": "uuid",
  "title": "逆天改命",
  "description": "修仙少年的崛起之路",
  "genre": "玄幻小说",
  "phases_completed": ["creative", "setting", "framework", "writing"],
  "message": "Project created successfully"
}
```

---

### 8. 生成方案选项

**POST** `/workflow/{session_id}/generate-options`

自动为当前阶段生成 3 个不同方向的方案供用户选择。

**请求体**: 无（后端根据会话上下文自动生成）

**响应**
```json
{
  "options": [
    {
      "id": "opt_1",
      "summary": "热血逆袭型：废材少年觉醒逆天血脉",
      "content": "详细内容..."
    },
    {
      "id": "opt_2",
      "summary": "稳健发展型：低调修炼厚积薄发",
      "content": "详细内容..."
    },
    {
      "id": "opt_3",
      "summary": "阴谋权术型：身陷阴谋步步为营",
      "content": "详细内容..."
    }
  ],
  "phase": "creative"
}
```

---

### 9. 选择方案

**POST** `/workflow/{session_id}/select-option`

选择并保存某个方案，支持在选择前编辑内容。

**请求体**
```json
{
  "option_id": "opt_1",
  "edited_content": "用户编辑后的内容（可选）"
}
```

**响应**
```json
{
  "saved": true,
  "current_phase": "creative",
  "completed_phases": ["creative"],
  "is_final": false
}
```

---

### 10. 重做阶段

**POST** `/workflow/{session_id}/redo-phase`

回退到指定阶段重做，会清除该阶段及之后所有阶段的数据。

**请求体**
```json
{
  "phase": "creative"
}
```

**响应**
```json
{
  "current_phase": "creative",
  "completed_phases": []
}
```

---

## 完整调用流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        工作流调用流程                            │
└─────────────────────────────────────────────────────────────────┘

POST /workflow/start
  │ 入参: {"genre": "玄幻小说"}
  │ 返回: session_id, available_templates
  ▼
┌─────────────────────────────────────────────────────────────────┐
│  阶段循环 (creative → setting → framework → writing)            │
│                                                                 │
│   POST /execute ──────────────────────────────────┐             │
│     │ 入参: {"template_id": "xxx", "input_data": {}}            │
│     │ 返回: LLM 生成内容                            │             │
│     ▼                                              │             │
│   ┌──────────────────────┐                        │             │
│   │ 用户查看/编辑内容     │                        │             │
│   └──────────┬───────────┘                        │             │
│              │                                    │             │
│        满意? ├─── 否 ──► POST /optimize ──────────┘             │
│              │            入参: current_result,                 │
│              │                  optimization_instruction        │
│              ▼                                                  │
│            [是]                                                 │
│              │                                                  │
│              ▼                                                  │
│   POST /next                                                    │
│     │ 入参: 无                                                   │
│     │ 返回: is_final, current_phase, available_templates        │
│     ▼                                                           │
│   is_final?                                                     │
│     │                                                           │
│     ├── false ──► 继续循环                                       │
│     │                                                           │
│     └── true ──► 退出循环                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
  │
  ▼
POST /workflow/{session_id}/complete
  │ 入参: {"project_title": "xxx", "project_description": "xxx"}
  │ 返回: project_id
  ▼
🎉 完成！
```

---

## 向导式工作流调用流程（新）

```
┌─────────────────────────────────────────────────────────────────┐
│                     向导式工作流调用流程                          │
└─────────────────────────────────────────────────────────────────┘

POST /workflow/start
  │ 入参: {"genre": "玄幻小说"}
  │ 返回: session_id
  ▼
┌─────────────────────────────────────────────────────────────────┐
│  阶段循环 (creative → setting → framework → writing)            │
│                                                                 │
│   POST /generate-options ───────────────────────────────────┐   │
│     │ 入参: 无（自动构建上下文）                              │   │
│     │ 返回: 3 个方案                                         │   │
│     ▼                                                        │   │
│   ┌──────────────────────────────────────────────────────┐  │   │
│   │ 用户选择方案（可编辑）                                 │  │   │
│   └──────────────────────┬───────────────────────────────┘  │   │
│                          │                                   │   │
│              不满意? ────┴──► POST /generate-options ────────┘   │
│                          │      （重新生成）                      │
│                          ▼                                       │
│   POST /select-option                                            │
│     │ 入参: option_id, edited_content                            │
│     │ 返回: is_final                                             │
│     ▼                                                            │
│   is_final?                                                      │
│     │                                                            │
│     ├── false ──► 继续循环（下一阶段）                            │
│     │                                                            │
│     └── true ──► 退出循环（进入预览）                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│  预览阶段                                                        │
│                                                                  │
│   展示四阶段汇总结果                                              │
│     │                                                            │
│     ├── 点击"重做" ──► POST /redo-phase ──► 返回循环              │
│     │                                                            │
│     └── 点击"创建" ──► 退出预览                                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
  │
  ▼
POST /workflow/{session_id}/complete
  │ 入参: {"project_title": "xxx", "project_description": "xxx"}
  │ 返回: project_id
  ▼
🎉 完成！
```

---

## 调用示例

```bash
TOKEN="your_jwt_token"
BASE="http://localhost:8000/workflow"

# 1. 启动工作流
SESSION_ID=$(curl -s -X POST "$BASE/start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"genre": "玄幻小说"}' | jq -r '.session_id')

echo "Session ID: $SESSION_ID"

# 2. Creative 阶段 - 执行模板
curl -X POST "$BASE/$SESSION_ID/execute" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "模板ID",
    "input_data": {}
  }'

# 3. (可选) 优化结果
curl -X POST "$BASE/$SESSION_ID/optimize" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_result": "当前内容...",
    "optimization_instruction": "让创意更独特"
  }'

# 4. 进入下一阶段
curl -X POST "$BASE/$SESSION_ID/next" \
  -H "Authorization: Bearer $TOKEN"

# 5. Setting 阶段 - 重复 execute → optimize → next

# 6. Framework 阶段 - 重复 execute → optimize → next

# 7. Writing 阶段 - 重复 execute → optimize → next
#    此时 /next 返回 is_final: true

# 8. 完成工作流，创建项目
curl -X POST "$BASE/$SESSION_ID/complete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_title": "逆天改命",
    "project_description": "废弃者吞噬世界规则的故事"
  }'
```

---

## 上下文传递机制

每个阶段的输出会自动合并到下一阶段的上下文中：

| 阶段 | 输出变量 | 传递到下一阶段 |
|------|----------|---------------|
| creative | `project_brief` | `inspiration_pool`, `top_recommendations` |
| setting | 世界观/角色 | `world_setting`, `character_sheet`, `characters` |
| framework | 大纲 | `chapter_outline`, `outline_overview` |
| writing | 章节内容 | - |

---

## 错误处理

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数无效（如阶段未执行就调用 next） |
| 401 | 未授权（Token 无效或过期） |
| 404 | 会话不存在或已过期 |
| 500 | 服务器内部错误 |

---

## 相关接口

### 模板管理 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/templates` | GET | 获取模板列表 |
| `/templates/phases` | GET | 获取所有阶段及模板数量 |
| `/templates/genres` | GET | 获取所有专题类型 |
| `/templates/{id}` | GET | 获取模板详情 |
| `/templates/{id}/render` | POST | 渲染模板（填充变量） |
| `/templates/workflow/templates` | GET | 获取工作流推荐模板 |

---

## 注意事项

1. **会话有效期**：24 小时，过期后需重新创建
2. **阶段顺序**：必须按 creative → setting → framework → writing 顺序执行
3. **最低要求**：至少完成 `creative` 和 `setting` 阶段才能创建项目
4. **上下文继承**：每个阶段的输出会自动传递给后续阶段
5. **空表单支持**：`execute` 时 `input_data` 可为空，LLM 会自动生成示例内容
