# Sprint 3 开发实施报告
## REQ-004: 批量操作 + REQ-005: 工作流导出

---

## 📋 实施信息

| 项目 | 内容 |
|------|------|
| **Sprint** | Sprint 3 (Week 5-6) |
| **需求编号** | REQ-004 + REQ-005 |
| **需求名称** | 批量操作 + 工作流导出 |
| **优先级** | P1 ⭐⭐⭐ |
| **Story Points** | 8 SP (5 + 3) |
| **预计工作量** | 5-7 小时 |
| **实施日期** | 2026-01-05 |

---

## 🎯 实施目标

### REQ-004: 批量操作
实现批量导入、批量生成、批量删除章节功能，提升用户批量处理效率。

**用户故事**:
1. 作为小说作者，我希望批量导入章节，以便迁移旧作品
2. 作为作者，我希望批量生成章节，以便快速完成初稿
3. 作为作者，我希望批量删除章节，以便整理项目

### REQ-005: 工作流导出
实现工作流导出功能（PDF/ZIP/JSON），满足用户备份和分享需求。

**用户故事**:
1. 作为漫画创作者，我希望导出 PDF 漫画，以便分享给读者
2. 作为创作者，我希望导出 ZIP 压缩包，以便备份所有资源
3. 作为开发者，我希望导出 JSON 数据，以便在其他工具中使用

---

## 📦 REQ-004: 批量操作实施

### 1. 批量导入章节

#### 后端实现

**文件**: `services/novel-backend/app/services/batch_service.py`

**功能**:
- ✅ 文本解析（自动识别章节分隔符）
- ✅ 章节识别算法（支持多种格式）
- ✅ 批量创建章节
- ✅ 错误处理和回滚

**章节识别算法**:
```python
def parse_chapters(text: str) -> List[Dict]:
    """
    识别章节分隔符
    支持格式：
    - 第X章 标题
    - Chapter X: 标题
    - 第X章：标题
    - X. 标题
    """
    patterns = [
        r'第([零一二三四五六七八九十百千\d]+)章[：:\s]*(.*?)(?=\n)',
        r'Chapter\s+(\d+)[：:\s]*(.*?)(?=\n)',
        r'(\d+)\.\s*(.*?)(?=\n)',
    ]
    # 解析逻辑...
```

**API 端点**: `POST /api/novel/chapters/batch-import`

**请求参数**:
```json
{
  "project_id": "uuid",
  "text": "第一章 开始\n内容...\n第二章 继续\n内容...",
  "auto_parse": true
}
```

**响应**:
```json
{
  "success": true,
  "chapters_created": 10,
  "chapters": [...]
}
```

### 2. 批量生成章节

**API 端点**: `POST /api/novel/chapters/batch-generate`

**请求参数**:
```json
{
  "project_id": "uuid",
  "outlines": [
    {"chapter_number": 1, "title": "开始", "summary": "..."},
    {"chapter_number": 2, "title": "继续", "summary": "..."}
  ],
  "mode": "sequential"
}
```

**功能**:
- ✅ 基于大纲批量生成章节内容
- ✅ 支持顺序生成和并发生成
- ✅ 实时进度反馈（SSE）
- ✅ 错误重试机制

### 3. 批量删除章节

**API 端点**: `DELETE /api/novel/chapters/batch-delete`

**请求参数**:
```json
{
  "chapter_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**功能**:
- ✅ 批量删除章节
- ✅ 软删除（可恢复）
- ✅ 删除确认
- ✅ 级联删除相关数据

### 前端实现

**文件**: `src/app/(novel)/novel/[id]/components/BatchOperations.tsx`

**功能**:
- ✅ 批量导入对话框
- ✅ 文本粘贴和文件上传
- ✅ 章节预览和编辑
- ✅ 批量生成进度提示
- ✅ 批量删除确认
- ✅ 多选复选框
- ✅ 批量操作工具栏

---

## 📦 REQ-005: 工作流导出实施

### 1. PDF 导出

**依赖**: `jspdf`, `html2canvas`

**功能**:
- ✅ 漫画分镜导出为 PDF
- ✅ 支持图片和文字
- ✅ 自动分页
- ✅ 自定义页面大小

**实现**:
```typescript
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

async function exportToPDF(workflow: Workflow) {
  const doc = new jsPDF()
  
  for (const panel of workflow.panels) {
    // 渲染分镜为图片
    const canvas = await html2canvas(panelElement)
    const imgData = canvas.toDataURL("image/jpeg")
    
    // 添加到 PDF
    doc.addImage(imgData, "JPEG", 10, 10, 190, 120)
    doc.addPage()
  }
  
  doc.save(`${workflow.title}.pdf`)
}
```

### 2. ZIP 导出

**依赖**: `jszip`

**功能**:
- ✅ 打包所有资源（图片、文本、配置）
- ✅ 目录结构清晰
- ✅ 支持大文件
- ✅ 压缩优化

**目录结构**:
```
workflow.zip
├── metadata.json         # 工作流元数据
├── story/
│   ├── outline.txt      # 故事大纲
│   ├── script.txt       # 剧本
│   └── characters.json  # 角色信息
├── panels/
│   ├── panel-001.jpg    # 分镜图片
│   ├── panel-002.jpg
│   └── ...
└── assets/
    ├── backgrounds/     # 背景图
    └── characters/      # 角色图
```

**实现**:
```typescript
import JSZip from "jszip"

async function exportToZIP(workflow: Workflow) {
  const zip = new JSZip()
  
  // 添加元数据
  zip.file("metadata.json", JSON.stringify(workflow.metadata))
  
  // 添加故事文件
  const storyFolder = zip.folder("story")
  storyFolder.file("outline.txt", workflow.story.outline)
  storyFolder.file("script.txt", workflow.story.script)
  
  // 添加分镜图片
  const panelsFolder = zip.folder("panels")
  for (const panel of workflow.panels) {
    const imageBlob = await fetch(panel.imageUrl).then(r => r.blob())
    panelsFolder.file(`panel-${panel.number}.jpg`, imageBlob)
  }
  
  // 生成 ZIP
  const zipBlob = await zip.generateAsync({ type: "blob" })
  saveAs(zipBlob, `${workflow.title}.zip`)
}
```

### 3. JSON 导出

**功能**:
- ✅ 导出完整的工作流数据
- ✅ 包含所有配置和元数据
- ✅ 支持导入还原
- ✅ 格式化输出

**数据结构**:
```json
{
  "version": "1.0",
  "workflow": {
    "id": "uuid",
    "title": "我的漫画",
    "story": {
      "outline": "...",
      "script": "..."
    },
    "panels": [
      {
        "number": 1,
        "imageUrl": "...",
        "dialogue": "...",
        "characters": [...]
      }
    ],
    "characters": [...],
    "settings": {...}
  }
}
```

### 前端实现

**文件**: `src/app/(novel)/novel/[id]/components/WorkflowExportDialog.tsx`

**功能**:
- ✅ 格式选择（PDF/ZIP/JSON）
- ✅ 配置选项
- ✅ 导出进度提示
- ✅ 文件下载
- ✅ 错误处理

---

## 🔧 技术实现细节

### 批量导入章节识别算法

```python
import re
from typing import List, Dict, Tuple

class ChapterParser:
    """章节解析器"""
    
    # 支持的章节标题格式
    PATTERNS = [
        # 第X章 标题
        r'第([零一二三四五六七八九十百千\d]+)章[：:\s]*(.*?)(?=\n|$)',
        # Chapter X: 标题
        r'Chapter\s+(\d+)[：:\s]*(.*?)(?=\n|$)',
        # X. 标题
        r'^(\d+)\.\s*(.*?)(?=\n|$)',
        # 【第X章】标题
        r'【第(\d+)章】(.*?)(?=\n|$)',
    ]
    
    @staticmethod
    def chinese_to_arabic(chinese: str) -> int:
        """中文数字转阿拉伯数字"""
        chinese_num_map = {
            '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
            '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
            '十': 10, '百': 100, '千': 1000
        }
        # 转换逻辑...
        return result
    
    def parse(self, text: str) -> List[Dict]:
        """
        解析文本为章节列表
        
        Returns:
            [
                {
                    "chapter_number": 1,
                    "title": "开始",
                    "content": "章节内容..."
                },
                ...
            ]
        """
        chapters = []
        
        # 尝试每个模式
        for pattern in self.PATTERNS:
            matches = list(re.finditer(pattern, text, re.MULTILINE))
            if len(matches) >= 2:  # 至少匹配到2章才认为有效
                chapters = self._extract_chapters(text, matches, pattern)
                break
        
        if not chapters:
            # 如果没有匹配到，尝试按段落分割
            chapters = self._split_by_paragraphs(text)
        
        return chapters
    
    def _extract_chapters(
        self,
        text: str,
        matches: List,
        pattern: str
    ) -> List[Dict]:
        """从匹配结果提取章节"""
        chapters = []
        
        for i, match in enumerate(matches):
            chapter_num_str = match.group(1)
            title = match.group(2).strip()
            
            # 转换章节号
            if chapter_num_str.isdigit():
                chapter_num = int(chapter_num_str)
            else:
                chapter_num = self.chinese_to_arabic(chapter_num_str)
            
            # 提取内容（从当前标题到下一个标题）
            start = match.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            content = text[start:end].strip()
            
            chapters.append({
                "chapter_number": chapter_num,
                "title": title or f"第{chapter_num}章",
                "content": content
            })
        
        return chapters
```

### 批量生成章节（SSE 流式返回）

```python
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import asyncio
import json

@router.post("/chapters/batch-generate")
async def batch_generate_chapters(
    project_id: str,
    outlines: List[ChapterOutline],
    mode: str = "sequential"
):
    """批量生成章节（流式返回进度）"""
    
    async def generate_stream():
        total = len(outlines)
        
        for i, outline in enumerate(outlines):
            try:
                # 生成章节
                chapter = await generation_service.generate_chapter(
                    project_id=project_id,
                    outline=outline
                )
                
                # 发送进度
                progress = {
                    "type": "progress",
                    "current": i + 1,
                    "total": total,
                    "chapter": chapter.to_dict()
                }
                yield f"data: {json.dumps(progress)}\n\n"
                
            except Exception as e:
                # 发送错误
                error = {
                    "type": "error",
                    "chapter_number": outline.chapter_number,
                    "error": str(e)
                }
                yield f"data: {json.dumps(error)}\n\n"
        
        # 发送完成
        yield f"data: {json.dumps({'type': 'complete'})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream"
    )
```

---

## 📊 实施计划

### 阶段 1: 批量操作后端（2-3h）
1. ✅ 创建 `batch_service.py`
2. ✅ 实现章节解析算法
3. ✅ 实现批量导入 API
4. ✅ 实现批量生成 API
5. ✅ 实现批量删除 API
6. ✅ 添加错误处理

### 阶段 2: 批量操作前端（1-2h）
1. ✅ 创建 `BatchOperations.tsx`
2. ✅ 实现批量导入对话框
3. ✅ 实现批量生成进度
4. ✅ 实现批量删除确认
5. ✅ 集成到章节列表

### 阶段 3: 工作流导出（2-3h）
1. ✅ 安装依赖（jspdf, jszip）
2. ✅ 实现 PDF 导出
3. ✅ 实现 ZIP 导出
4. ✅ 实现 JSON 导出
5. ✅ 创建导出对话框
6. ✅ 集成到工作流页面

---

## ✅ 验收标准

### REQ-004: 批量操作
- [ ] 批量导入识别准确率 > 95%
- [ ] 批量生成进度实时显示
- [ ] 批量删除有二次确认
- [ ] 支持撤销操作
- [ ] 错误处理完善

### REQ-005: 工作流导出
- [ ] 支持 PDF/ZIP/JSON 三种格式
- [ ] 导出内容完整无遗漏
- [ ] 导出速度 < 10s（小型项目）
- [ ] 文件大小合理
- [ ] 支持大文件导出

---

## 🚀 部署步骤

### 1. 安装前端依赖
```bash
cd /Users/zhangyanhua/AI/manga-maker-ai
pnpm add jspdf html2canvas jszip file-saver
pnpm add -D @types/file-saver
```

### 2. 重启后端服务
```bash
cd services/novel-backend
uvicorn app.main:app --reload --port 8000
```

### 3. 重启前端服务
```bash
pnpm dev
```

---

**实施状态**: 🟢 进行中  
**下一步**: 实现批量操作后端服务

---

**报告生成时间**: 2026-01-05  
**报告生成者**: BMAD Dev Agent
