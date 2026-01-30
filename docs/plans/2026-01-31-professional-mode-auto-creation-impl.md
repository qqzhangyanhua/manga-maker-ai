# Professional Mode Auto-Creation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform professional creation mode from manual template-filling workflow to guided auto-generation with 3 options per phase.

**Architecture:** Replace existing 4-stage manual workflow (workflow → generating → result → loop) with auto-generation flow (options_generating → options_select → editing → loop → preview). Backend generates 3 options per phase automatically; user selects and optionally edits before confirming.

**Tech Stack:** Next.js 14 + TypeScript (frontend), Python FastAPI (backend), PostgreSQL (state persistence)

---

## Phase 1: Backend API (Python FastAPI)

### Task 1.1: Add Request/Response Models for New Endpoints

**Files:**
- Modify: `services/novel-backend/app/routers/workflow.py:22-49`

**Step 1: Write the new Pydantic models**

Add after line 49 (after `CompleteWorkflowRequest` class):

```python
class GenerateOptionsRequest(BaseModel):
    """生成方案请求 - 无需用户输入，后端自动构建"""
    pass  # 后端根据 session 上下文自动生成


class GenerateOptionsResponse(BaseModel):
    """生成方案响应"""
    options: List[dict] = Field(..., description="3 个方案")
    phase: str = Field(..., description="当前阶段")


class SelectOptionRequest(BaseModel):
    """选择方案请求"""
    option_id: str = Field(..., description="选中的方案 ID")
    edited_content: Optional[str] = Field(None, description="用户编辑后的内容（可选）")


class SelectOptionResponse(BaseModel):
    """选择方案响应"""
    saved: bool = Field(True, description="是否保存成功")
    current_phase: str = Field(..., description="当前阶段")
    completed_phases: List[str] = Field(..., description="已完成阶段")


class RedoPhaseRequest(BaseModel):
    """重做阶段请求"""
    phase: str = Field(..., description="要重做的阶段")


class RedoPhaseResponse(BaseModel):
    """重做阶段响应"""
    current_phase: str = Field(..., description="当前阶段")
    completed_phases: List[str] = Field(..., description="已完成阶段")
```

**Step 2: Run linter to verify no syntax errors**

Run: `cd services/novel-backend && python -c "from app.routers.workflow import *"`
Expected: No output (success)

**Step 3: Commit**

```bash
git add services/novel-backend/app/routers/workflow.py
git commit -m "$(cat <<'EOF'
feat(workflow): add pydantic models for generate-options API

Add request/response models for the new guided workflow endpoints:
- GenerateOptionsRequest/Response for 3-option generation
- SelectOptionRequest/Response for option selection with edit support
- RedoPhaseRequest/Response for phase redo functionality
EOF
)"
```

---

### Task 1.2: Implement generate_options Service Method

**Files:**
- Modify: `services/novel-backend/app/services/workflow_service.py`

**Step 1: Add the generate_options method**

Add after the `optimize_result` method (around line 529):

```python
async def generate_options(
    self,
    session_id: str,
    user_id: str,
    num_options: int = 3,
) -> Dict[str, Any]:
    """
    为当前阶段生成多个方案供用户选择
    
    Args:
        session_id: 会话ID
        user_id: 用户ID
        num_options: 生成方案数量，默认 3
        
    Returns:
        包含 options 和 phase 的字典
    """
    session = await self.get_session(session_id, user_id)
    if not session:
        raise ValueError("Session not found or expired")
    
    current_phase = session["current_phase"]
    phase_data = session.get("phase_data", {})
    phase_info = self.PHASES.get(current_phase, {})
    
    # 构建上下文
    context = self._merge_context(phase_data, {})
    genre = phase_data.get("genre", "通用")
    
    # 构建系统提示词
    system_prompt = f"""你是一位资深网文创作顾问，正在帮助作者进行 {phase_info.get('display_name', current_phase)}。

当前任务：为用户生成 {num_options} 个不同风格/方向的方案供选择。

专题类型：{genre or '通用'}

要求：
1. 每个方案必须有明显差异化（风格、基调、方向等不同）
2. 每个方案都应该完整可用，不是草稿或大纲
3. 每个方案包含：
   - id: 方案标识（opt_1, opt_2, opt_3）
   - summary: 一句话摘要（15-25 字，突出方案特色）
   - content: 详细内容
4. 内容要专业、有吸引力、符合网文读者口味
5. 输出格式为 JSON 数组

输出格式示例：
```json
[
  {{"id": "opt_1", "summary": "热血逆袭型：废材少年觉醒逆天血脉", "content": "详细内容..."}},
  {{"id": "opt_2", "summary": "稳健发展型：低调修炼厚积薄发", "content": "详细内容..."}},
  {{"id": "opt_3", "summary": "阴谋权术型：身陷阴谋步步为营", "content": "详细内容..."}}
]
```
"""
    
    # 构建用户提示词，包含已完成阶段的上下文
    user_prompt_parts = [f"## 当前阶段：{phase_info.get('display_name', current_phase)}\n"]
    user_prompt_parts.append(f"阶段描述：{phase_info.get('description', '')}\n\n")
    
    if context:
        user_prompt_parts.append("## 已有创作上下文\n")
        for key, value in context.items():
            if value and key not in ["genre"]:
                if isinstance(value, (dict, list)):
                    import json as json_module
                    user_prompt_parts.append(f"### {key}\n```json\n{json_module.dumps(value, ensure_ascii=False, indent=2)}\n```\n")
                else:
                    user_prompt_parts.append(f"### {key}\n{value}\n")
    
    user_prompt_parts.append(f"\n请生成 {num_options} 个不同方向的方案，直接输出 JSON 数组，不要添加其他内容。")
    user_prompt = "\n".join(user_prompt_parts)
    
    # 调用 LLM 生成
    result = await generation_service.generate_with_prompt(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.9,  # 高温度增加多样性
        max_tokens=8192,
    )
    
    content = result.get("content", "")
    options = self._parse_options(content, num_options)
    
    # 保存生成的选项到会话
    async with AsyncSessionLocal() as db_session:
        phase_data["current_options"] = options
        phase_data["options_generated_at"] = datetime.utcnow().isoformat()
        
        await db_session.execute(
            text("""
                UPDATE workflow_sessions
                SET phase_data = :phase_data, updated_at = NOW()
                WHERE id = :session_id
            """),
            {"phase_data": json.dumps(phase_data), "session_id": session_id},
        )
        await db_session.commit()
    
    return {
        "options": options,
        "phase": current_phase,
    }

def _parse_options(self, content: str, expected_count: int = 3) -> List[Dict[str, Any]]:
    """解析 LLM 返回的选项"""
    import re
    
    # 尝试直接解析 JSON
    try:
        options = json.loads(content)
        if isinstance(options, list):
            return options[:expected_count]
    except json.JSONDecodeError:
        pass
    
    # 尝试提取 JSON 代码块
    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
    if json_match:
        try:
            options = json.loads(json_match.group(1))
            if isinstance(options, list):
                return options[:expected_count]
        except json.JSONDecodeError:
            pass
    
    # 如果解析失败，返回默认结构
    return [
        {
            "id": f"opt_{i+1}",
            "summary": f"方案 {i+1}",
            "content": content if i == 0 else f"方案 {i+1} 内容待生成",
        }
        for i in range(expected_count)
    ]
```

**Step 2: Run linter to verify**

Run: `cd services/novel-backend && python -c "from app.services.workflow_service import workflow_service; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add services/novel-backend/app/services/workflow_service.py
git commit -m "$(cat <<'EOF'
feat(workflow): add generate_options service method

Implement auto-generation of 3 distinct options per phase:
- Builds context from completed phases
- Uses high temperature (0.9) for diversity
- Parses LLM JSON output with fallback handling
- Saves generated options to session state
EOF
)"
```

---

### Task 1.3: Implement select_option Service Method

**Files:**
- Modify: `services/novel-backend/app/services/workflow_service.py`

**Step 1: Add the select_option method**

Add after `generate_options` method:

```python
async def select_option(
    self,
    session_id: str,
    user_id: str,
    option_id: str,
    edited_content: Optional[str] = None,
) -> Dict[str, Any]:
    """
    选择并保存某个方案
    
    Args:
        session_id: 会话ID
        user_id: 用户ID
        option_id: 选中的方案 ID
        edited_content: 用户编辑后的内容（可选）
        
    Returns:
        保存结果
    """
    session = await self.get_session(session_id, user_id)
    if not session:
        raise ValueError("Session not found or expired")
    
    current_phase = session["current_phase"]
    phase_data = session.get("phase_data", {})
    completed_phases = session.get("completed_phases", [])
    
    # 获取选中的方案
    options = phase_data.get("current_options", [])
    selected_option = next((o for o in options if o.get("id") == option_id), None)
    
    if not selected_option:
        raise ValueError(f"Option {option_id} not found")
    
    # 使用编辑后的内容或原始内容
    final_content = edited_content if edited_content else selected_option.get("content", "")
    
    # 保存到阶段数据
    async with AsyncSessionLocal() as db_session:
        if "phases" not in phase_data:
            phase_data["phases"] = {}
        
        phase_data["phases"][current_phase] = {
            "selected_option_id": option_id,
            "selected_summary": selected_option.get("summary", ""),
            "output": final_content,
            "edited": edited_content is not None,
            "completed_at": datetime.utcnow().isoformat(),
        }
        
        # 清理临时选项数据
        phase_data.pop("current_options", None)
        phase_data.pop("options_generated_at", None)
        
        # 将当前阶段加入已完成列表
        if current_phase not in completed_phases:
            completed_phases.append(current_phase)
        
        # 确定下一阶段
        phase_order = list(self.PHASES.keys())
        current_index = phase_order.index(current_phase)
        is_final = current_index >= len(phase_order) - 1
        
        if not is_final:
            next_phase = phase_order[current_index + 1]
            await db_session.execute(
                text("""
                    UPDATE workflow_sessions
                    SET phase_data = :phase_data, 
                        current_phase = :current_phase,
                        completed_phases = :completed_phases,
                        updated_at = NOW()
                    WHERE id = :session_id
                """),
                {
                    "phase_data": json.dumps(phase_data),
                    "current_phase": next_phase,
                    "completed_phases": json.dumps(completed_phases),
                    "session_id": session_id,
                },
            )
        else:
            # 最后阶段，不改变 current_phase
            await db_session.execute(
                text("""
                    UPDATE workflow_sessions
                    SET phase_data = :phase_data, 
                        completed_phases = :completed_phases,
                        updated_at = NOW()
                    WHERE id = :session_id
                """),
                {
                    "phase_data": json.dumps(phase_data),
                    "completed_phases": json.dumps(completed_phases),
                    "session_id": session_id,
                },
            )
        
        await db_session.commit()
    
    return {
        "saved": True,
        "current_phase": current_phase,
        "completed_phases": completed_phases,
        "is_final": is_final,
    }
```

**Step 2: Run linter to verify**

Run: `cd services/novel-backend && python -c "from app.services.workflow_service import workflow_service; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add services/novel-backend/app/services/workflow_service.py
git commit -m "$(cat <<'EOF'
feat(workflow): add select_option service method

Implement option selection with edit support:
- Validates option_id exists in current options
- Saves selected content (original or edited) to phase data
- Auto-advances to next phase after selection
- Returns is_final flag for preview transition
EOF
)"
```

---

### Task 1.4: Implement redo_phase Service Method

**Files:**
- Modify: `services/novel-backend/app/services/workflow_service.py`

**Step 1: Add the redo_phase method**

Add after `select_option` method:

```python
async def redo_phase(
    self,
    session_id: str,
    user_id: str,
    phase: str,
) -> Dict[str, Any]:
    """
    回退到指定阶段重做
    
    Args:
        session_id: 会话ID
        user_id: 用户ID
        phase: 要重做的阶段
        
    Returns:
        重做结果
    """
    if phase not in self.PHASES:
        raise ValueError(f"Invalid phase: {phase}")
    
    session = await self.get_session(session_id, user_id)
    if not session:
        raise ValueError("Session not found or expired")
    
    phase_data = session.get("phase_data", {})
    completed_phases = session.get("completed_phases", [])
    
    # 获取要重做阶段的顺序
    phase_order = list(self.PHASES.keys())
    redo_index = phase_order.index(phase)
    
    # 移除该阶段及之后所有阶段的数据
    phases_to_remove = phase_order[redo_index:]
    for p in phases_to_remove:
        if p in completed_phases:
            completed_phases.remove(p)
        if "phases" in phase_data and p in phase_data["phases"]:
            del phase_data["phases"][p]
    
    # 清理临时数据
    phase_data.pop("current_options", None)
    phase_data.pop("options_generated_at", None)
    
    # 更新会话
    async with AsyncSessionLocal() as db_session:
        await db_session.execute(
            text("""
                UPDATE workflow_sessions
                SET phase_data = :phase_data, 
                    current_phase = :current_phase,
                    completed_phases = :completed_phases,
                    updated_at = NOW()
                WHERE id = :session_id
            """),
            {
                "phase_data": json.dumps(phase_data),
                "current_phase": phase,
                "completed_phases": json.dumps(completed_phases),
                "session_id": session_id,
            },
        )
        await db_session.commit()
    
    return {
        "current_phase": phase,
        "completed_phases": completed_phases,
    }
```

**Step 2: Run linter to verify**

Run: `cd services/novel-backend && python -c "from app.services.workflow_service import workflow_service; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add services/novel-backend/app/services/workflow_service.py
git commit -m "$(cat <<'EOF'
feat(workflow): add redo_phase service method

Implement phase redo functionality for preview stage:
- Validates phase name exists
- Removes target phase and all subsequent phases from completed list
- Clears phase data for removed phases
- Resets current_phase to redo target
EOF
)"
```

---

### Task 1.5: Add API Router Endpoints

**Files:**
- Modify: `services/novel-backend/app/routers/workflow.py`

**Step 1: Add the three new endpoints**

Add before the `abandon_workflow` endpoint (around line 281):

```python
@router.post("/{session_id}/generate-options")
async def generate_options(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    生成当前阶段的方案选项
    
    自动根据会话上下文生成 3 个不同方向的方案供用户选择
    
    Args:
        session_id: 会话 ID
        
    Returns:
        options: 3 个方案列表，每个包含 id、summary、content
        phase: 当前阶段
    """
    try:
        result = await workflow_service.generate_options(
            session_id=session_id,
            user_id=user_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Workflow generate_options failed for session {session_id}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.post("/{session_id}/select-option")
async def select_option(
    session_id: str,
    request: SelectOptionRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    选择并确认某个方案
    
    选中方案后保存到会话，支持在选择前编辑内容
    
    Args:
        session_id: 会话 ID
        request: 选择请求，包含 option_id 和可选的 edited_content
        
    Returns:
        saved: 是否保存成功
        current_phase: 当前阶段
        completed_phases: 已完成阶段列表
    """
    try:
        result = await workflow_service.select_option(
            session_id=session_id,
            user_id=user_id,
            option_id=request.option_id,
            edited_content=request.edited_content,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Workflow select_option failed for session {session_id}")
        raise HTTPException(status_code=500, detail=f"Selection failed: {str(e)}")


@router.post("/{session_id}/redo-phase")
async def redo_phase(
    session_id: str,
    request: RedoPhaseRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    回退到指定阶段重做
    
    用于预览阶段的回退功能，回退会清除目标阶段及之后的所有数据
    
    Args:
        session_id: 会话 ID
        request: 重做请求，包含目标阶段
        
    Returns:
        current_phase: 当前阶段
        completed_phases: 已完成阶段列表
    """
    try:
        result = await workflow_service.redo_phase(
            session_id=session_id,
            user_id=user_id,
            phase=request.phase,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Workflow redo_phase failed for session {session_id}")
        raise HTTPException(status_code=500, detail=f"Redo failed: {str(e)}")
```

**Step 2: Add missing imports at the top of the file**

Update imports section to include `List`:

```python
from typing import Optional, List
```

**Step 3: Run linter to verify**

Run: `cd services/novel-backend && python -c "from app.routers.workflow import router; print('OK')"`
Expected: `OK`

**Step 4: Commit**

```bash
git add services/novel-backend/app/routers/workflow.py
git commit -m "$(cat <<'EOF'
feat(workflow): add generate-options, select-option, redo-phase endpoints

Add three new API endpoints for guided workflow:
- POST /workflow/{id}/generate-options - auto-generate 3 options
- POST /workflow/{id}/select-option - select and save an option
- POST /workflow/{id}/redo-phase - return to specific phase
EOF
)"
```

---

## Phase 2: Frontend Types and State Machine

### Task 2.1: Update Types Definition

**Files:**
- Modify: `src/app/(novel)/novel/components/ProfessionalMode/types.ts`

**Step 1: Update DialogStage type**

Replace lines 46-52:

```typescript
export type DialogStage =
  | "genre_select"
  | "options_generating"  // 新增：方案生成中
  | "options_select"      // 新增：方案选择
  | "editing"             // 新增：编辑确认
  | "preview"             // 新增：预览汇总
  | "completing"
  | "session_expired";
```

**Step 2: Add new interfaces**

Add after `OptimizationHistory` interface (around line 42):

```typescript
export interface GeneratedOption {
  id: string;
  content: string;
  summary: string;
}

export interface PhaseResult {
  phase: string;
  phaseName: string;
  content: string;
  summary: string;
}
```

**Step 3: Update WorkflowState interface**

Add new fields to the interface (around line 64-83):

```typescript
export interface WorkflowState {
  stage: DialogStage;
  session: WorkflowSession | null;
  genres: Genre[];
  selectedGenre: string | null;
  selectedTemplate: Template | null;
  inputData: Record<string, string>;
  generatedResult: string;
  parsedResult: Record<string, unknown> | null;
  projectTitle: string;
  projectDescription: string;
  loading: boolean;
  optimizing: boolean;
  optimizationInput: string;
  optimizationHistory: OptimizationHistory[];
  showHistoryPanel: boolean;
  pendingSession: WorkflowSession | null;
  showResumePrompt: boolean;
  showCloseConfirm: boolean;
  // 新增字段
  generatedOptions: GeneratedOption[];
  selectedOptionId: string | null;
  editingContent: string;
  phaseResults: PhaseResult[];
}
```

**Step 4: Update WorkflowAction type**

Add new action types after existing ones (around line 145):

```typescript
export type WorkflowAction =
  | { type: "SET_STAGE"; payload: DialogStage }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_OPTIMIZING"; payload: boolean }
  | { type: "SET_GENRES"; payload: Genre[] }
  | { type: "SET_SELECTED_GENRE"; payload: string | null }
  | { type: "SET_SELECTED_TEMPLATE"; payload: Template | null }
  | { type: "SET_INPUT_DATA"; payload: Record<string, string> }
  | { type: "SET_GENERATED_RESULT"; payload: string }
  | { type: "SET_PARSED_RESULT"; payload: Record<string, unknown> | null }
  | { type: "SET_PROJECT_TITLE"; payload: string }
  | { type: "SET_PROJECT_DESCRIPTION"; payload: string }
  | { type: "SET_OPTIMIZATION_INPUT"; payload: string }
  | { type: "SET_SHOW_HISTORY_PANEL"; payload: boolean }
  | { type: "SET_SHOW_CLOSE_CONFIRM"; payload: boolean }
  | { type: "SET_SHOW_RESUME_PROMPT"; payload: boolean }
  | { type: "SET_PENDING_SESSION"; payload: WorkflowSession | null }
  | { type: "SET_SESSION"; payload: WorkflowSession | null }
  | { type: "START_WORKFLOW_SUCCESS"; payload: WorkflowSession }
  | { type: "EXECUTE_PHASE_SUCCESS"; payload: { result: string; parsedResult: Record<string, unknown> | null } }
  | { type: "NEXT_PHASE_SUCCESS"; payload: { isFinal: boolean; currentPhase?: string; completedPhases?: string[]; availableTemplates?: Template[] } }
  | { type: "PREVIOUS_PHASE_SUCCESS"; payload: { currentPhase: string; completedPhases: string[]; availableTemplates: Template[]; previousInput?: Record<string, string>; previousOutput?: string } }
  | { type: "OPTIMIZE_SUCCESS"; payload: { result: string; parsedResult: Record<string, unknown> | null; instruction?: string } }
  | { type: "REVERT_TO_VERSION"; payload: number }
  | { type: "SESSION_EXPIRED" }
  | { type: "RESUME_SESSION" }
  | { type: "START_NEW_SESSION" }
  | { type: "RESET" }
  // 新增 action types
  | { type: "GENERATE_OPTIONS_SUCCESS"; payload: GeneratedOption[] }
  | { type: "SELECT_OPTION"; payload: { id: string; content: string } }
  | { type: "SET_EDITING_CONTENT"; payload: string }
  | { type: "CONFIRM_PHASE"; payload: PhaseResult }
  | { type: "REDO_PHASE"; payload: string }
  | { type: "REGENERATE_OPTIONS" };
```

**Step 5: Add new Props interfaces**

Add after existing Props interfaces (around line 177):

```typescript
export interface OptionsGeneratingProps extends StageProps {}

export interface OptionsSelectProps extends StageProps {
  onSelectOption: (optionId: string, content: string) => void;
  onRegenerateOptions: () => Promise<void>;
}

export interface EditingProps extends StageProps {
  onConfirm: () => Promise<void>;
  onBackToSelect: () => void;
}

export interface PreviewProps extends StageProps {
  onRedoPhase: (phase: string) => Promise<void>;
  onComplete: () => void;
}
```

**Step 6: Update initialState**

Update the initialState constant (around line 242):

```typescript
export const initialState: WorkflowState = {
  stage: "genre_select",
  session: null,
  genres: [],
  selectedGenre: null,
  selectedTemplate: null,
  inputData: {},
  generatedResult: "",
  parsedResult: null,
  projectTitle: "",
  projectDescription: "",
  loading: false,
  optimizing: false,
  optimizationInput: "",
  optimizationHistory: [],
  showHistoryPanel: false,
  pendingSession: null,
  showResumePrompt: false,
  showCloseConfirm: false,
  // 新增字段初始值
  generatedOptions: [],
  selectedOptionId: null,
  editingContent: "",
  phaseResults: [],
};
```

**Step 7: Run type check**

Run: `npm run type-check`
Expected: No errors related to types.ts

**Step 8: Commit**

```bash
git add src/app/\(novel\)/novel/components/ProfessionalMode/types.ts
git commit -m "$(cat <<'EOF'
feat(professional-mode): update types for guided workflow

- Add new DialogStage values: options_generating, options_select, editing, preview
- Add GeneratedOption and PhaseResult interfaces
- Extend WorkflowState with new fields for option selection
- Add new WorkflowAction types for the guided flow
- Add Props interfaces for new stage components
EOF
)"
```

---

### Task 2.2: Update API Layer

**Files:**
- Modify: `src/app/(novel)/novel/components/ProfessionalMode/api.ts`

**Step 1: Add new API functions**

Add after `completeWorkflow` function (around line 140):

```typescript
export interface GeneratedOption {
  id: string;
  content: string;
  summary: string;
}

export async function generateOptions(sessionId: string): Promise<{
  options: GeneratedOption[];
  phase: string;
}> {
  const response = await fetch(
    `/api/novel/workflow/${sessionId}/generate-options`,
    { method: "POST" }
  );
  return handleResponse(response);
}

export async function selectOption(
  sessionId: string,
  optionId: string,
  editedContent?: string
): Promise<{
  saved: boolean;
  current_phase: string;
  completed_phases: string[];
  is_final: boolean;
}> {
  const response = await fetch(
    `/api/novel/workflow/${sessionId}/select-option`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        option_id: optionId,
        edited_content: editedContent || null,
      }),
    }
  );
  return handleResponse(response);
}

export async function redoPhase(
  sessionId: string,
  phase: string
): Promise<{
  current_phase: string;
  completed_phases: string[];
}> {
  const response = await fetch(
    `/api/novel/workflow/${sessionId}/redo-phase`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase }),
    }
  );
  return handleResponse(response);
}
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors related to api.ts

**Step 3: Commit**

```bash
git add src/app/\(novel\)/novel/components/ProfessionalMode/api.ts
git commit -m "$(cat <<'EOF'
feat(professional-mode): add API functions for guided workflow

- generateOptions(): auto-generate 3 options for current phase
- selectOption(): select and optionally edit an option
- redoPhase(): return to specific phase for redo
EOF
)"
```

---

### Task 2.3: Update Reducer (useWorkflowMachine)

**Files:**
- Modify: `src/app/(novel)/novel/components/ProfessionalMode/useWorkflowMachine.ts`

**Step 1: Import new types**

Update imports at line 7-12:

```typescript
import {
  WorkflowState,
  WorkflowAction,
  initialState,
  OptimizationHistory,
  GeneratedOption,
  PhaseResult,
  WORKFLOW_PHASES,
} from "./types";
```

**Step 2: Update START_WORKFLOW_SUCCESS case**

Replace the case (around line 70-76) to auto-transition to options_generating:

```typescript
case "START_WORKFLOW_SUCCESS":
  return {
    ...state,
    session: action.payload,
    stage: "options_generating",  // 改为自动进入方案生成
    loading: true,  // 保持 loading 状态，等待 options 生成
    phaseResults: [],  // 重置阶段结果
  };
```

**Step 3: Add new reducer cases**

Add before the `default` case (around line 190):

```typescript
case "GENERATE_OPTIONS_SUCCESS":
  return {
    ...state,
    stage: "options_select",
    generatedOptions: action.payload,
    loading: false,
  };

case "SELECT_OPTION":
  return {
    ...state,
    stage: "editing",
    selectedOptionId: action.payload.id,
    editingContent: action.payload.content,
  };

case "SET_EDITING_CONTENT":
  return {
    ...state,
    editingContent: action.payload,
  };

case "CONFIRM_PHASE": {
  const newPhaseResults = [...state.phaseResults, action.payload];
  const isAllComplete = newPhaseResults.length >= 4;
  
  // 更新 session 的 completed_phases
  const updatedSession = state.session
    ? {
        ...state.session,
        completed_phases: newPhaseResults.map((r) => r.phase),
        current_phase: isAllComplete
          ? state.session.current_phase
          : WORKFLOW_PHASES[newPhaseResults.length]?.phase || state.session.current_phase,
      }
    : null;
  
  return {
    ...state,
    stage: isAllComplete ? "preview" : "options_generating",
    session: updatedSession,
    phaseResults: newPhaseResults,
    generatedOptions: [],
    selectedOptionId: null,
    editingContent: "",
    loading: isAllComplete ? false : true,
  };
}

case "REDO_PHASE": {
  const phaseToRedo = action.payload;
  const phaseIndex = WORKFLOW_PHASES.findIndex((p) => p.phase === phaseToRedo);
  
  // 过滤掉要重做的阶段及之后的所有阶段
  const filteredResults = state.phaseResults.filter((r) => {
    const rIndex = WORKFLOW_PHASES.findIndex((p) => p.phase === r.phase);
    return rIndex < phaseIndex;
  });
  
  const updatedSession = state.session
    ? {
        ...state.session,
        completed_phases: filteredResults.map((r) => r.phase),
        current_phase: phaseToRedo,
      }
    : null;
  
  return {
    ...state,
    stage: "options_generating",
    session: updatedSession,
    phaseResults: filteredResults,
    generatedOptions: [],
    selectedOptionId: null,
    editingContent: "",
    loading: true,
  };
}

case "REGENERATE_OPTIONS":
  return {
    ...state,
    stage: "options_generating",
    generatedOptions: [],
    loading: true,
  };
```

**Step 4: Run type check**

Run: `npm run type-check`
Expected: No errors related to useWorkflowMachine.ts

**Step 5: Commit**

```bash
git add src/app/\(novel\)/novel/components/ProfessionalMode/useWorkflowMachine.ts
git commit -m "$(cat <<'EOF'
feat(professional-mode): update reducer for guided workflow

Add reducer cases for new workflow actions:
- GENERATE_OPTIONS_SUCCESS: transition to options_select
- SELECT_OPTION: transition to editing stage
- SET_EDITING_CONTENT: update editing content
- CONFIRM_PHASE: save result and advance or go to preview
- REDO_PHASE: rollback to specific phase
- REGENERATE_OPTIONS: request new options
EOF
)"
```

---

## Phase 3: Frontend Components

### Task 3.1: Create OptionsGenerating Component

**Files:**
- Create: `src/app/(novel)/novel/components/ProfessionalMode/stages/OptionsGenerating.tsx`

**Step 1: Create the component file**

```typescript
/**
 * 方案生成中界面
 * 显示 loading 状态，等待 AI 生成 3 个方案
 */

import { Loader2 } from "lucide-react";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { WORKFLOW_PHASES, OptionsGeneratingProps } from "../types";

export function OptionsGenerating({ state }: OptionsGeneratingProps) {
  const { session, phaseResults } = state;

  // 当前正在生成的阶段是下一个未完成的阶段
  const currentPhaseIndex = phaseResults.length;
  const currentPhaseInfo = WORKFLOW_PHASES[currentPhaseIndex] || null;

  return (
    <div className="space-y-6">
      <ProgressIndicator state={state} />

      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-pulse" />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-white">
            AI 正在为您生成方案...
          </h3>
          <p className="text-sm text-zinc-400">
            {currentPhaseInfo?.displayName}: {currentPhaseInfo?.description}
          </p>
          <p className="text-xs text-zinc-500 mt-4">
            正在生成 3 个不同方向的创意方案供您选择
          </p>
        </div>

        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-purple-500/50 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/\(novel\)/novel/components/ProfessionalMode/stages/OptionsGenerating.tsx
git commit -m "$(cat <<'EOF'
feat(professional-mode): add OptionsGenerating component

Loading state component shown while AI generates 3 options:
- Shows progress indicator
- Displays current phase info
- Animated loading indicators
EOF
)"
```

---

### Task 3.2: Create OptionsSelect Component

**Files:**
- Create: `src/app/(novel)/novel/components/ProfessionalMode/stages/OptionsSelect.tsx`

**Step 1: Create the component file**

```typescript
/**
 * 方案选择界面
 * 展示 3 个方案卡片，用户选择其一
 */

import { RefreshCw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { novelTheme } from "../../../theme";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { WORKFLOW_PHASES, OptionsSelectProps } from "../types";

export function OptionsSelect({
  state,
  dispatch,
  onSelectOption,
  onRegenerateOptions,
}: OptionsSelectProps) {
  const { generatedOptions, phaseResults, loading } = state;

  const currentPhaseIndex = phaseResults.length;
  const currentPhaseInfo = WORKFLOW_PHASES[currentPhaseIndex] || null;

  const handleSelect = (optionId: string, content: string) => {
    onSelectOption(optionId, content);
  };

  return (
    <div className="space-y-6">
      <ProgressIndicator state={state} />

      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white">
          {currentPhaseInfo?.displayName} - 选择您喜欢的方向
        </h3>
        <p className="text-sm text-zinc-400 mt-1">
          AI 为您生成了 3 个不同风格的方案，请选择最符合您创作意图的一个
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {generatedOptions.map((option, index) => (
          <div
            key={option.id}
            className={cn(
              "group relative rounded-lg border border-zinc-700 bg-zinc-800/50 p-4",
              "hover:border-purple-500/50 hover:bg-zinc-800 transition-all cursor-pointer"
            )}
            onClick={() => handleSelect(option.id, option.content)}
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="h-5 w-5 text-purple-400" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-sm font-medium">
                  {String.fromCharCode(65 + index)}
                </span>
                <h4 className="font-medium text-white text-sm line-clamp-1">
                  {option.summary}
                </h4>
              </div>

              <div className="text-sm text-zinc-400 line-clamp-6 whitespace-pre-wrap">
                {option.content.slice(0, 300)}
                {option.content.length > 300 && "..."}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(option.id, option.content);
                }}
              >
                选择此方案
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={onRegenerateOptions}
          disabled={loading}
          className={novelTheme.button.outline}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          {loading ? "重新生成中..." : "重新生成方案"}
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/\(novel\)/novel/components/ProfessionalMode/stages/OptionsSelect.tsx
git commit -m "$(cat <<'EOF'
feat(professional-mode): add OptionsSelect component

3-card selection UI for generated options:
- Displays summary and content preview for each option
- Click-to-select with hover effects
- Regenerate button for new options
EOF
)"
```

---

### Task 3.3: Create Editing Component

**Files:**
- Create: `src/app/(novel)/novel/components/ProfessionalMode/stages/Editing.tsx`

**Step 1: Create the component file**

```typescript
/**
 * 编辑确认界面
 * 用户可编辑选中的方案，确认后进入下一阶段
 */

import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { novelTheme } from "../../../theme";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { WORKFLOW_PHASES, EditingProps } from "../types";

export function Editing({
  state,
  dispatch,
  onConfirm,
  onBackToSelect,
}: EditingProps) {
  const { editingContent, phaseResults, loading } = state;

  const currentPhaseIndex = phaseResults.length;
  const currentPhaseInfo = WORKFLOW_PHASES[currentPhaseIndex] || null;

  const handleContentChange = (value: string) => {
    dispatch({ type: "SET_EDITING_CONTENT", payload: value });
  };

  return (
    <div className="space-y-6">
      <ProgressIndicator state={state} />

      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-white">
          {currentPhaseInfo?.displayName} - 编辑确认
        </h3>
        <p className="text-sm text-zinc-400 mt-1">
          您可以对选中的方案进行编辑调整，满意后确认进入下一阶段
        </p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300">
          方案内容（可编辑）
        </label>
        <Textarea
          value={editingContent}
          onChange={(e) => handleContentChange(e.target.value)}
          rows={16}
          className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 resize-none font-mono text-sm"
          placeholder="方案内容..."
        />
        <p className="text-xs text-zinc-500">
          提示：您可以自由修改内容，系统会保存您编辑后的版本
        </p>
      </div>

      <div className="flex justify-between pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={onBackToSelect}
          className={novelTheme.button.outline}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回重选
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading || !editingContent.trim()}
          className={novelTheme.button.primary}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              确认，进入下一阶段
              <Check className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/\(novel\)/novel/components/ProfessionalMode/stages/Editing.tsx
git commit -m "$(cat <<'EOF'
feat(professional-mode): add Editing component

Edit confirmation UI for selected option:
- Full-height textarea for content editing
- Back button to return to option selection
- Confirm button to save and advance
EOF
)"
```

---

### Task 3.4: Create Preview Component

**Files:**
- Create: `src/app/(novel)/novel/components/ProfessionalMode/stages/Preview.tsx`

**Step 1: Create the component file**

```typescript
/**
 * 预览汇总界面
 * 四阶段完成后展示所有结果，支持回退重做
 */

import { Check, RotateCcw, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { novelTheme } from "../../../theme";
import { WORKFLOW_PHASES, PreviewProps } from "../types";

export function Preview({
  state,
  dispatch,
  onRedoPhase,
  onComplete,
}: PreviewProps) {
  const { phaseResults, projectTitle, projectDescription, loading } = state;

  const handleTitleChange = (value: string) => {
    dispatch({ type: "SET_PROJECT_TITLE", payload: value });
  };

  const handleDescriptionChange = (value: string) => {
    dispatch({ type: "SET_PROJECT_DESCRIPTION", payload: value });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="h-8 w-8 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold text-white">创作完成 - 预览汇总</h3>
        <p className="text-sm text-zinc-400 mt-1">
          请确认以下创作内容，您可以点击"重做"返回任意阶段修改
        </p>
      </div>

      <div className="space-y-3">
        {WORKFLOW_PHASES.map((phaseInfo) => {
          const result = phaseResults.find((r) => r.phase === phaseInfo.phase);
          const PhaseIcon = phaseInfo.icon;

          return (
            <div
              key={phaseInfo.phase}
              className={cn(
                "rounded-lg border bg-zinc-800/50 overflow-hidden",
                result ? "border-green-500/30" : "border-zinc-700"
              )}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      result ? "bg-green-500/20" : "bg-zinc-700/50"
                    )}
                  >
                    {result ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <PhaseIcon className="h-4 w-4 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">
                      {phaseInfo.displayName}
                    </h4>
                    {result && (
                      <p className="text-xs text-zinc-400">{result.summary}</p>
                    )}
                  </div>
                </div>
                {result && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRedoPhase(phaseInfo.phase)}
                    className="text-zinc-400 hover:text-white hover:bg-zinc-700"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    重做
                  </Button>
                )}
              </div>
              {result && (
                <div className="px-4 py-3 max-h-32 overflow-y-auto">
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap line-clamp-4">
                    {result.content.slice(0, 500)}
                    {result.content.length > 500 && "..."}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-4 pt-4 border-t border-zinc-800">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            项目名称 *
          </label>
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="输入小说标题..."
            className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            项目描述（可选）
          </label>
          <textarea
            value={projectDescription}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="简要描述你的小说故事..."
            rows={2}
            className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={() => dispatch({ type: "SET_STAGE", payload: "genre_select" })}
          className={novelTheme.button.outline}
        >
          取消
        </Button>
        <Button
          onClick={onComplete}
          disabled={loading || !projectTitle.trim()}
          className={novelTheme.button.primary}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              创建中...
            </>
          ) : (
            <>
              创建项目
              <Check className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/\(novel\)/novel/components/ProfessionalMode/stages/Preview.tsx
git commit -m "$(cat <<'EOF'
feat(professional-mode): add Preview component

Summary preview UI after all 4 phases complete:
- Shows all phase results with summaries
- Redo button for each phase
- Project title/description input
- Create project button
EOF
)"
```

---

### Task 3.5: Update Main Component (index.tsx)

**Files:**
- Modify: `src/app/(novel)/novel/components/ProfessionalMode/index.tsx`

**Step 1: Add imports for new components**

Update imports section (around lines 32-37):

```typescript
import { GenreSelect } from "./stages/GenreSelect";
import { OptionsGenerating } from "./stages/OptionsGenerating";
import { OptionsSelect } from "./stages/OptionsSelect";
import { Editing } from "./stages/Editing";
import { Preview } from "./stages/Preview";
import { Completing } from "./stages/Completing";
import { SessionExpired } from "./stages/SessionExpired";
```

**Step 2: Add new callback functions**

Add after `completeWorkflow` function (around line 270):

```typescript
// 生成方案选项
const generateOptions = useCallback(async () => {
  if (!state.session) return;

  setLoading(true);
  try {
    const data = await api.generateOptions(state.session.session_id);
    dispatch({ type: "GENERATE_OPTIONS_SUCCESS", payload: data.options });
  } catch (error) {
    if (error instanceof api.SessionExpiredError) {
      dispatch({ type: "SESSION_EXPIRED" });
    } else {
      toast.error(error instanceof Error ? error.message : "生成方案失败");
      // 回退到选择类型
      setStage("genre_select");
    }
    setLoading(false);
  }
}, [state.session, dispatch, setLoading, setStage]);

// 选择方案
const handleSelectOption = useCallback((optionId: string, content: string) => {
  dispatch({ type: "SELECT_OPTION", payload: { id: optionId, content } });
}, [dispatch]);

// 重新生成方案
const handleRegenerateOptions = useCallback(async () => {
  dispatch({ type: "REGENERATE_OPTIONS" });
  await generateOptions();
}, [dispatch, generateOptions]);

// 确认当前阶段
const handleConfirmPhase = useCallback(async () => {
  if (!state.session || !state.editingContent) return;

  setLoading(true);
  try {
    const currentPhaseIndex = state.phaseResults.length;
    const currentPhaseInfo = WORKFLOW_PHASES[currentPhaseIndex];
    
    // 调用后端保存
    const result = await api.selectOption(
      state.session.session_id,
      state.selectedOptionId || "opt_1",
      state.editingContent
    );

    // 找到选中的方案摘要
    const selectedOption = state.generatedOptions.find(
      (o) => o.id === state.selectedOptionId
    );

    dispatch({
      type: "CONFIRM_PHASE",
      payload: {
        phase: currentPhaseInfo.phase,
        phaseName: currentPhaseInfo.displayName,
        content: state.editingContent,
        summary: selectedOption?.summary || currentPhaseInfo.displayName,
      },
    });

    // 如果不是最后阶段，自动触发下一阶段的方案生成
    if (!result.is_final) {
      await generateOptions();
    }
  } catch (error) {
    if (error instanceof api.SessionExpiredError) {
      dispatch({ type: "SESSION_EXPIRED" });
    } else {
      toast.error(error instanceof Error ? error.message : "保存失败");
    }
    setLoading(false);
  }
}, [
  state.session,
  state.editingContent,
  state.selectedOptionId,
  state.generatedOptions,
  state.phaseResults,
  dispatch,
  setLoading,
  generateOptions,
]);

// 返回方案选择
const handleBackToSelect = useCallback(() => {
  setStage("options_select");
}, [setStage]);

// 重做某个阶段
const handleRedoPhase = useCallback(async (phase: string) => {
  if (!state.session) return;

  setLoading(true);
  try {
    await api.redoPhase(state.session.session_id, phase);
    dispatch({ type: "REDO_PHASE", payload: phase });
    // 自动触发方案生成
    await generateOptions();
  } catch (error) {
    if (error instanceof api.SessionExpiredError) {
      dispatch({ type: "SESSION_EXPIRED" });
    } else {
      toast.error(error instanceof Error ? error.message : "重做失败");
    }
    setLoading(false);
  }
}, [state.session, dispatch, setLoading, generateOptions]);

// 从预览进入完成
const handleGoToComplete = useCallback(() => {
  setStage("completing");
}, [setStage]);
```

**Step 3: Update startWorkflow to trigger options generation**

Modify the startWorkflow function (around line 86-98):

```typescript
// 开始工作流
const startWorkflow = useCallback(
  async (genre: string | null) => {
    setLoading(true);
    try {
      const session = await api.startWorkflow(genre);
      dispatch({ type: "START_WORKFLOW_SUCCESS", payload: session });
      // 立即触发第一阶段的方案生成
      const data = await api.generateOptions(session.session_id);
      dispatch({ type: "GENERATE_OPTIONS_SUCCESS", payload: data.options });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "启动工作流失败");
      setLoading(false);
    }
  },
  [dispatch, setLoading]
);
```

**Step 4: Update renderContent function**

Replace the entire renderContent function (around line 302-354):

```typescript
// 根据阶段渲染内容
const renderContent = () => {
  switch (state.stage) {
    case "genre_select":
      return (
        <GenreSelect
          state={state}
          dispatch={dispatch}
          onStartWorkflow={startWorkflow}
          onResumeSession={resumeSession}
          onClose={handleClose}
        />
      );
    case "options_generating":
      return <OptionsGenerating state={state} dispatch={dispatch} />;
    case "options_select":
      return (
        <OptionsSelect
          state={state}
          dispatch={dispatch}
          onSelectOption={handleSelectOption}
          onRegenerateOptions={handleRegenerateOptions}
        />
      );
    case "editing":
      return (
        <Editing
          state={state}
          dispatch={dispatch}
          onConfirm={handleConfirmPhase}
          onBackToSelect={handleBackToSelect}
        />
      );
    case "preview":
      return (
        <Preview
          state={state}
          dispatch={dispatch}
          onRedoPhase={handleRedoPhase}
          onComplete={handleGoToComplete}
        />
      );
    case "completing":
      return (
        <Completing
          state={state}
          dispatch={dispatch}
          onComplete={completeWorkflow}
        />
      );
    case "session_expired":
      return <SessionExpired state={state} dispatch={dispatch} />;
    default:
      return null;
  }
};
```

**Step 5: Update getDescription function**

Update the getDescription function (around line 356-367):

```typescript
const getDescription = () => {
  if (state.stage === "genre_select") {
    return "选择创作类型开始专业的小说创作流程";
  }
  if (state.stage === "options_generating" || state.stage === "options_select" || state.stage === "editing") {
    const currentPhaseIndex = state.phaseResults.length;
    const phaseInfo = WORKFLOW_PHASES[currentPhaseIndex];
    return `${phaseInfo?.displayName || ""} - ${phaseInfo?.description || ""}`;
  }
  if (state.stage === "preview") {
    return "预览并确认您的创作内容";
  }
  if (state.stage === "completing") {
    return "为您的作品命名并创建项目";
  }
  if (state.stage === "session_expired") {
    return "会话已过期，请重新开始";
  }
  return "";
};
```

**Step 6: Run type check**

Run: `npm run type-check`
Expected: No errors

**Step 7: Commit**

```bash
git add src/app/\(novel\)/novel/components/ProfessionalMode/index.tsx
git commit -m "$(cat <<'EOF'
feat(professional-mode): integrate guided workflow in main component

- Add imports for new stage components
- Add callbacks: generateOptions, handleSelectOption, handleConfirmPhase, handleRedoPhase
- Update startWorkflow to auto-trigger first options generation
- Update renderContent to handle new stages
- Update getDescription for new stage messages
EOF
)"
```

---

### Task 3.6: Update ProgressIndicator for New Flow

**Files:**
- Modify: `src/app/(novel)/novel/components/ProfessionalMode/components/ProgressIndicator.tsx`

**Step 1: Read current implementation**

Run: Read the file to understand current implementation

**Step 2: Update to use phaseResults for progress**

The component should use `state.phaseResults` to determine completed phases. Update the component:

```typescript
/**
 * 进度指示器组件
 * 显示四阶段工作流进度
 */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOW_PHASES, StageProps } from "../types";

export function ProgressIndicator({ state }: Pick<StageProps, "state">) {
  const { phaseResults } = state;
  
  // 使用 phaseResults 长度判断当前进度
  const currentPhaseIndex = phaseResults.length;
  const completedPhases = phaseResults.map((r) => r.phase);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {WORKFLOW_PHASES.map((phase, index) => {
        const isCompleted = completedPhases.includes(phase.phase);
        const isCurrent = index === currentPhaseIndex;
        const PhaseIcon = phase.icon;

        return (
          <div key={phase.phase} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
                isCompleted && "bg-green-500/20 text-green-400",
                isCurrent && !isCompleted && "bg-purple-500/20 text-purple-400",
                !isCompleted && !isCurrent && "bg-zinc-800 text-zinc-500"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center",
                  isCompleted && "bg-green-500/30",
                  isCurrent && !isCompleted && "bg-purple-500/30",
                  !isCompleted && !isCurrent && "bg-zinc-700"
                )}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <PhaseIcon className="w-3 h-3" />
                )}
              </div>
              <span className="hidden sm:inline">{phase.shortName}</span>
            </div>
            {index < WORKFLOW_PHASES.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1",
                  index < currentPhaseIndex ? "bg-green-500/50" : "bg-zinc-700"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Step 3: Run type check**

Run: `npm run type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/\(novel\)/novel/components/ProfessionalMode/components/ProgressIndicator.tsx
git commit -m "$(cat <<'EOF'
refactor(professional-mode): update ProgressIndicator for new flow

Use phaseResults array instead of session.completed_phases to track progress,
enabling proper display during the new guided workflow.
EOF
)"
```

---

## Phase 4: Cleanup and Testing

### Task 4.1: Remove Deprecated Components

**Files:**
- Delete: `src/app/(novel)/novel/components/ProfessionalMode/stages/Workflow.tsx`
- Delete: `src/app/(novel)/novel/components/ProfessionalMode/stages/Generating.tsx`
- Delete: `src/app/(novel)/novel/components/ProfessionalMode/stages/Result.tsx`

**Step 1: Verify no imports reference these files**

Run: `grep -r "from.*Workflow" src/app/\(novel\)/novel/components/ProfessionalMode/`
Run: `grep -r "from.*Generating" src/app/\(novel\)/novel/components/ProfessionalMode/`
Run: `grep -r "from.*Result" src/app/\(novel\)/novel/components/ProfessionalMode/`

Expected: Only index.tsx should import these (and we've already updated it)

**Step 2: Delete the files**

```bash
rm src/app/\(novel\)/novel/components/ProfessionalMode/stages/Workflow.tsx
rm src/app/\(novel\)/novel/components/ProfessionalMode/stages/Generating.tsx
rm src/app/\(novel\)/novel/components/ProfessionalMode/stages/Result.tsx
```

**Step 3: Verify build succeeds**

Run: `npm run build`
Expected: Build completes without errors

**Step 4: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(professional-mode): remove deprecated stage components

Remove old manual workflow components replaced by guided workflow:
- Workflow.tsx (replaced by OptionsSelect)
- Generating.tsx (replaced by OptionsGenerating)
- Result.tsx (replaced by Editing)
EOF
)"
```

---

### Task 4.2: Clean Up Unused Types and Actions

**Files:**
- Modify: `src/app/(novel)/novel/components/ProfessionalMode/types.ts`

**Step 1: Remove deprecated DialogStage values**

Remove "workflow", "generating", "result" from DialogStage if still present (they should already be gone from Task 2.1)

**Step 2: Remove unused WorkflowStageProps interface**

If `WorkflowStageProps` is no longer used, remove it.

**Step 3: Run type check**

Run: `npm run type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/\(novel\)/novel/components/ProfessionalMode/types.ts
git commit -m "$(cat <<'EOF'
chore(professional-mode): clean up unused types

Remove deprecated types no longer needed after guided workflow migration.
EOF
)"
```

---

### Task 4.3: Update Documentation

**Files:**
- Modify: `services/novel-backend/docs/workflow-api.md`

**Step 1: Add documentation for new endpoints**

Add after the existing endpoint documentation:

```markdown
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
```

**Step 2: Commit**

```bash
git add services/novel-backend/docs/workflow-api.md
git commit -m "$(cat <<'EOF'
docs(workflow): add documentation for guided workflow endpoints

Document new API endpoints:
- POST /generate-options
- POST /select-option
- POST /redo-phase

Add new workflow flow diagram for guided creation process.
EOF
)"
```

---

### Task 4.4: Final Verification

**Step 1: Run full type check**

Run: `npm run type-check`
Expected: No errors

**Step 2: Run linter**

Run: `npm run lint`
Expected: No errors (or only pre-existing warnings)

**Step 3: Build the application**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Start backend and verify endpoints**

Run: 
```bash
cd services/novel-backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Then in another terminal:
```bash
curl http://localhost:8000/docs | head -20
```
Expected: Swagger docs load and show new endpoints

**Step 5: Final commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(professional-mode): complete guided workflow implementation

Professional creation mode now uses guided auto-generation:
- User selects genre, system auto-generates 3 options per phase
- User selects preferred option, can edit before confirming
- All 4 phases complete leads to preview summary
- Preview allows redo of any phase
- Final step creates project with all phase results

Breaking changes:
- Removed manual template selection workflow
- API changes: new endpoints, deprecated execute endpoint for this flow
EOF
)"
```

---

## Summary

This implementation plan covers:

1. **Phase 1 (Backend)**: 5 tasks
   - Pydantic models for new endpoints
   - `generate_options` service method with LLM integration
   - `select_option` service method with session state management
   - `redo_phase` service method for preview rollback
   - FastAPI router endpoints

2. **Phase 2 (Frontend State)**: 3 tasks
   - Type definitions update
   - API layer functions
   - Reducer cases for new actions

3. **Phase 3 (Frontend Components)**: 6 tasks
   - OptionsGenerating component (loading state)
   - OptionsSelect component (3-card selection)
   - Editing component (edit confirmation)
   - Preview component (summary with redo)
   - Main component integration
   - ProgressIndicator update

4. **Phase 4 (Cleanup)**: 4 tasks
   - Remove deprecated components
   - Clean up unused types
   - Update documentation
   - Final verification

Total: **18 tasks** with granular TDD steps and frequent commits.
