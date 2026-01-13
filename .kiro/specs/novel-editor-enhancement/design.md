# Design Document - 小说编辑器增强

## Overview

本设计文档描述了小说创作模块的核心功能增强方案，包括富文本编辑器集成、导出功能实现、小说转漫画流程打通三大核心功能。设计遵循渐进式增强原则，确保向后兼容现有数据结构。

### Design Goals
1. **提升编辑体验** - 集成 Tiptap 富文本编辑器，支持格式化和 Markdown 快捷键
2. **完善导出功能** - 实现 TXT/EPUB 格式导出，支持章节选择和预览
3. **打通转漫画流程** - 实现场景提取、分镜生成、角色绑定完整流程
4. **保证性能** - 优化大文件编辑和导出性能
5. **向后兼容** - 保持现有数据结构，支持平滑迁移

### Technology Stack
- **富文本编辑器**: Tiptap v2 (基于 ProseMirror)
- **导出库**: epub-gen-memory (EPUB), jsPDF (PDF)
- **状态管理**: TanStack Query + Zustand
- **UI 组件**: shadcn/ui + Radix UI
- **类型安全**: TypeScript + Zod

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Novel Editor │  │ Export Dialog│  │ Comic Convert│     │
│  │  Component   │  │  Component   │  │   Dialog     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼───────┐    │
│  │         Rich Text Editor (Tiptap)                   │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │    │
│  │  │ Toolbar │  │ Markdown│  │ Auto    │            │    │
│  │  │ Plugin  │  │ Plugin  │  │ Save    │            │    │
│  │  └─────────┘  └─────────┘  └─────────┘            │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         Export Service                                │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │    │
│  │  │ TXT     │  │ EPUB    │  │ Preview │             │    │
│  │  │ Exporter│  │ Exporter│  │ Generator│            │    │
│  │  └─────────┘  └─────────┘  └─────────┘             │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         Comic Converter Service                       │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │    │
│  │  │ Scene   │  │ Panel   │  │ Character│            │    │
│  │  │ Extractor│ │ Generator│ │ Binder  │            │    │
│  │  └─────────┘  └─────────┘  └─────────┘             │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend API (Next.js API Routes)           │
├─────────────────────────────────────────────────────────────┤
│  /api/novel/projects/[id]          - Project CRUD          │
│  /api/novel/projects/[id]/export   - Export endpoint       │
│  /api/novel/projects/[id]/convert  - Convert to comic      │
│  /api/novel/chapters/[id]          - Chapter CRUD          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database (PostgreSQL + Prisma)             │
├─────────────────────────────────────────────────────────────┤
│  NovelProject  - 项目表                                     │
│  NovelChapter  - 章节表 (content: JSON)                    │
│  Story         - 漫画故事表 (source_novel_id)              │
│  Panel         - 分镜表                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### 1. Rich Text Editor Component

```typescript
// src/components/novel/RichTextEditor.tsx

interface RichTextEditorProps {
  content: JSONContent | string;
  onChange: (content: JSONContent) => void;
  onSave?: () => void;
  placeholder?: string;
  editable?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number; // ms
}

interface EditorState {
  content: JSONContent;
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

// Tiptap Extensions
const extensions = [
  StarterKit,           // 基础功能
  Placeholder,          // 占位符
  CharacterCount,       // 字数统计
  Typography,           // 智能排版
  Markdown,             // Markdown 支持
  BubbleMenu,           // 浮动菜单
  FloatingMenu,         // 悬浮菜单
]
```

### 2. Auto Save Manager

```typescript
// src/lib/novel/auto-save-manager.ts

interface AutoSaveConfig {
  delay: number;              // 防抖延迟 (ms)
  maxRetries: number;         // 最大重试次数
  offlineStorage: boolean;    // 离线存储
  conflictResolution: 'server' | 'local' | 'manual';
}

class AutoSaveManager {
  private saveTimer: NodeJS.Timeout | null = null;
  private retryCount: number = 0;
  
  async save(content: JSONContent): Promise<SaveResult>;
  async saveToLocal(content: JSONContent): Promise<void>;
  async syncFromLocal(): Promise<void>;
  async resolveConflict(local: JSONContent, server: JSONContent): Promise<JSONContent>;
}

interface SaveResult {
  success: boolean;
  timestamp: Date;
  error?: string;
  conflictDetected?: boolean;
}
```

### 3. Export Service

```typescript
// src/lib/novel/export-service.ts

interface ExportOptions {
  format: 'txt' | 'epub' | 'pdf' | 'markdown';
  chapterIds: string[];      // 选中的章节
  metadata?: ExportMetadata;
  settings?: ExportSettings;
}

interface ExportMetadata {
  title: string;
  author: string;
  description?: string;
  coverImage?: string;
  language?: string;
  publisher?: string;
}

interface ExportSettings {
  // TXT settings
  encoding?: 'utf-8' | 'gbk';
  lineBreak?: '\n' | '\r\n';
  chapterSeparator?: string;
  
  // EPUB settings
  includeTableOfContents?: boolean;
  chapterPerFile?: boolean;
  cssStyles?: string;
  
  // Common settings
  includeMetadata?: boolean;
  removeFormatting?: boolean;
}

class ExportService {
  async exportToTXT(options: ExportOptions): Promise<Blob>;
  async exportToEPUB(options: ExportOptions): Promise<Blob>;
  async generatePreview(options: ExportOptions): Promise<string>;
  async validateExport(blob: Blob, format: string): Promise<ValidationResult>;
}
```

### 4. Comic Converter Service

```typescript
// src/lib/novel/comic-converter.ts

interface ConversionOptions {
  chapterId: string;
  targetStyle?: string;      // 漫画风格
  panelsPerScene?: number;   // 每场景分镜数
  autoBindCharacters?: boolean;
}

interface Scene {
  id: string;
  order: number;
  location: string;
  timeOfDay: string;
  atmosphere: string;
  description: string;
  dialogue: DialogueLine[];
  characters: string[];
  visualElements: string[];
  suggestedPanelCount: number;
}

interface DialogueLine {
  speaker: string;
  text: string;
  emotion?: string;
}

interface PanelSuggestion {
  sceneId: string;
  panelType: string;        // wide, medium, closeup, action, dialogue
  shotSize: string;         // 特写/近景/中景/全景/远景
  cameraAngle: string;      // 俯视/仰视/平视
  description: string;
  dialogue?: string;
  characters: string[];
}

class ComicConverter {
  async extractScenes(chapterContent: string): Promise<Scene[]>;
  async generatePanelSuggestions(scenes: Scene[]): Promise<PanelSuggestion[]>;
  async bindCharacters(novelCharacters: string[], comicCharacters: Character[]): Promise<CharacterBinding[]>;
  async createStoryboardProject(suggestions: PanelSuggestion[]): Promise<string>; // returns projectId
}
```

---

## Data Models

### 1. NovelChapter Content Structure

```typescript
// 章节内容存储格式 (Tiptap JSON)

interface ChapterContent {
  type: 'doc';
  content: ContentNode[];
}

interface ContentNode {
  type: 'paragraph' | 'heading' | 'text' | 'hardBreak';
  attrs?: {
    level?: number;        // heading level (1-6)
  };
  content?: ContentNode[];
  text?: string;
  marks?: Mark[];
}

interface Mark {
  type: 'bold' | 'italic' | 'underline' | 'strike' | 'code';
  attrs?: Record<string, any>;
}

// Example:
const exampleContent: ChapterContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: '第一章：相遇' }]
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: '这是一个' },
        { type: 'text', text: '重要', marks: [{ type: 'bold' }] },
        { type: 'text', text: '的开始。' }
      ]
    }
  ]
}
```

### 2. Export History

```typescript
// 导出历史记录

interface ExportRecord {
  id: string;
  projectId: string;
  userId: string;
  format: string;
  chapterIds: string[];
  fileUrl: string;
  fileSize: number;
  metadata: ExportMetadata;
  createdAt: Date;
}

// Database schema (Prisma)
model NovelExportHistory {
  id          String   @id @default(uuid())
  project_id  String   @db.Uuid
  user_id     String   @db.Uuid
  format      String   // txt, epub, pdf
  chapter_ids String[] // Array of chapter IDs
  file_url    String?  // MinIO URL
  file_size   Int?     // bytes
  metadata    Json     // ExportMetadata
  created_at  DateTime @default(now())
  
  @@index([project_id, created_at])
  @@index([user_id, created_at])
  @@map("novel_export_history")
}
```

### 3. Comic Conversion Mapping

```typescript
// 小说→漫画转换映射

interface ConversionMapping {
  id: string;
  novelProjectId: string;
  comicProjectId: string;
  chapterMappings: ChapterMapping[];
  characterBindings: CharacterBinding[];
  createdAt: Date;
}

interface ChapterMapping {
  novelChapterId: string;
  comicChapterId: string;
  scenes: SceneMapping[];
}

interface SceneMapping {
  sceneId: string;
  panelIds: string[];
  startOffset: number;    // 在章节中的起始位置
  endOffset: number;      // 在章节中的结束位置
}

interface CharacterBinding {
  novelCharacterName: string;
  comicCharacterId: string;
  confidence: number;     // 0-1, AI 匹配置信度
}

// Database schema
model NovelComicMapping {
  id                String   @id @default(uuid())
  novel_project_id  String   @db.Uuid
  comic_project_id  String   @db.Uuid
  chapter_mappings  Json     // ChapterMapping[]
  character_bindings Json    // CharacterBinding[]
  created_at        DateTime @default(now())
  
  @@unique([novel_project_id, comic_project_id])
  @@map("novel_comic_mappings")
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Content Serialization Round Trip
*For any* valid editor content, serializing to JSON then deserializing SHALL produce equivalent content.

**Validates: Requirements 11.4**

### Property 2: Auto Save Idempotence
*For any* chapter content, saving twice without changes SHALL produce the same result as saving once.

**Validates: Requirements 2.2, 2.3**

### Property 3: Export Format Preservation
*For any* chapter with rich text formatting, exporting to EPUB then importing SHALL preserve all supported formats (bold, italic, headings).

**Validates: Requirements 4.4**

### Property 4: Chapter Selection Consistency
*For any* set of selected chapters, the export file SHALL contain exactly those chapters in the correct order.

**Validates: Requirements 5.6**

### Property 5: Scene Extraction Completeness
*For any* chapter content, the total text length of extracted scenes SHALL equal the original chapter length (excluding whitespace).

**Validates: Requirements 6.7**

### Property 6: Character Binding Uniqueness
*For any* novel character, it SHALL be bound to at most one comic character.

**Validates: Requirements 8.6**

### Property 7: Word Count Accuracy
*For any* editor content, the displayed word count SHALL match the actual number of words in the plain text representation.

**Validates: Requirements 1.9**

### Property 8: Conflict Resolution Determinism
*For any* pair of conflicting versions, the conflict resolution algorithm SHALL always produce the same result given the same resolution strategy.

**Validates: Requirements 2.8**

### Property 9: Export File Validity
*For any* exported EPUB file, it SHALL pass EPUBCheck validation.

**Validates: Requirements 4.7, 4.8**

### Property 10: Panel Count Estimation
*For any* scene, the estimated panel count SHALL be between 1 and 10.

**Validates: Requirements 7.6**

---

## Error Handling

### 1. Editor Errors

```typescript
enum EditorErrorType {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  CONTENT_PARSE_ERROR = 'CONTENT_PARSE_ERROR',
  SAVE_FAILED = 'SAVE_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONFLICT_DETECTED = 'CONFLICT_DETECTED',
}

class EditorError extends Error {
  constructor(
    public type: EditorErrorType,
    message: string,
    public recoverable: boolean = true,
    public retryable: boolean = true
  ) {
    super(message);
  }
}

// Error handling strategy
function handleEditorError(error: EditorError): void {
  if (error.type === EditorErrorType.SAVE_FAILED && error.retryable) {
    // Retry with exponential backoff
    autoSaveManager.retry();
  } else if (error.type === EditorErrorType.CONFLICT_DETECTED) {
    // Show conflict resolution dialog
    showConflictDialog();
  } else if (!error.recoverable) {
    // Save to local storage and notify user
    autoSaveManager.saveToLocal();
    toast.error('编辑器遇到严重错误，内容已保存到本地');
  }
}
```

### 2. Export Errors

```typescript
enum ExportErrorType {
  INVALID_FORMAT = 'INVALID_FORMAT',
  CHAPTER_NOT_FOUND = 'CHAPTER_NOT_FOUND',
  GENERATION_FAILED = 'GENERATION_FAILED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
}

// Error recovery
async function exportWithRetry(options: ExportOptions, maxRetries: number = 3): Promise<Blob> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await exportService.export(options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
  throw new Error('Export failed after retries');
}
```

### 3. Conversion Errors

```typescript
enum ConversionErrorType {
  SCENE_EXTRACTION_FAILED = 'SCENE_EXTRACTION_FAILED',
  CHARACTER_BINDING_FAILED = 'CHARACTER_BINDING_FAILED',
  PANEL_GENERATION_FAILED = 'PANEL_GENERATION_FAILED',
  LLM_API_ERROR = 'LLM_API_ERROR',
}

// Graceful degradation
async function convertWithFallback(chapterId: string): Promise<ConversionResult> {
  try {
    // Try AI-powered conversion
    return await comicConverter.convert(chapterId);
  } catch (error) {
    if (error.type === ConversionErrorType.LLM_API_ERROR) {
      // Fallback to rule-based conversion
      return await ruleBasedConverter.convert(chapterId);
    }
    throw error;
  }
}
```

---

## Testing Strategy

### Unit Tests
- **Editor Component**: 测试编辑器初始化、内容更新、格式化功能
- **Auto Save Manager**: 测试防抖、重试、离线存储逻辑
- **Export Service**: 测试各格式导出、元数据处理
- **Comic Converter**: 测试场景提取、分镜生成算法

### Property-Based Tests (Minimum 100 iterations)
- **Property 1**: 测试内容序列化往返一致性
- **Property 2**: 测试自动保存幂等性
- **Property 3**: 测试导出格式保留
- **Property 4**: 测试章节选择一致性
- **Property 5**: 测试场景提取完整性
- **Property 6**: 测试角色绑定唯一性
- **Property 7**: 测试字数统计准确性
- **Property 8**: 测试冲突解决确定性
- **Property 9**: 测试导出文件有效性
- **Property 10**: 测试分镜数量估算范围

### Integration Tests
- **Editor + Auto Save**: 测试编辑→自动保存→加载流程
- **Export + Preview**: 测试导出→预览→下载流程
- **Conversion + Storyboard**: 测试转换→创建分镜项目流程

### E2E Tests
- 用户创建章节→编辑内容→自动保存→导出 EPUB
- 用户编辑章节→转漫画→查看分镜→生成图片

---

## Performance Considerations

### 1. Editor Performance
- **Virtual Scrolling**: 章节超过 5000 字时启用虚拟滚动
- **Lazy Loading**: 延迟加载非关键扩展（如表格、图片）
- **Debouncing**: 自动保存使用 2 秒防抖
- **Memory Management**: 切换章节时清理编辑器实例

### 2. Export Performance
- **Streaming**: 大文件导出使用流式处理
- **Worker Threads**: EPUB 生成使用 Web Worker
- **Caching**: 缓存章节内容避免重复查询
- **Progress Tracking**: 显示导出进度条

### 3. Conversion Performance
- **Batch Processing**: 批量处理场景提取
- **Parallel Requests**: 并行调用 LLM API
- **Result Caching**: 缓存场景提取结果
- **Timeout Handling**: 设置合理的超时时间

---

## Security Considerations

### 1. Content Security
- **XSS Prevention**: 使用 DOMPurify 清理用户输入
- **CSRF Protection**: 所有 API 请求包含 CSRF token
- **Content Validation**: 验证章节内容大小和格式

### 2. Export Security
- **File Size Limits**: 限制导出文件大小（最大 50MB）
- **Rate Limiting**: 限制导出频率（每用户每小时 10 次）
- **Access Control**: 验证用户对项目的访问权限

### 3. API Security
- **Authentication**: 所有 API 需要 JWT 认证
- **Authorization**: 验证用户对资源的操作权限
- **Input Sanitization**: 清理所有用户输入

---

## Migration Strategy

### Phase 1: Editor Migration (Week 1-2)
1. 安装 Tiptap 依赖
2. 创建 RichTextEditor 组件
3. 实现自动保存管理器
4. 迁移现有章节编辑器
5. 数据迁移：纯文本 → Tiptap JSON

### Phase 2: Export Implementation (Week 3)
1. 实现 TXT 导出
2. 实现 EPUB 导出
3. 实现导出预览
4. 实现章节选择
5. 创建导出历史记录

### Phase 3: Conversion Implementation (Week 4-5)
1. 实现场景提取
2. 实现分镜生成
3. 实现角色绑定
4. 集成到现有分镜编辑器
5. 创建转换映射记录

### Phase 4: Testing & Optimization (Week 6)
1. 编写单元测试
2. 编写属性测试
3. 性能优化
4. 用户测试
5. Bug 修复

---

## Deployment Plan

### 1. Feature Flags
```typescript
const featureFlags = {
  richTextEditor: true,      // 富文本编辑器
  exportTXT: true,           // TXT 导出
  exportEPUB: false,         // EPUB 导出（灰度发布）
  comicConversion: false,    // 转漫画（开发中）
}
```

### 2. Rollout Strategy
- **Week 1-2**: 内部测试（开发团队）
- **Week 3**: Beta 测试（10% 用户）
- **Week 4**: 灰度发布（50% 用户）
- **Week 5**: 全量发布（100% 用户）

### 3. Monitoring
- **Error Tracking**: Sentry 监控错误
- **Performance Monitoring**: 监控编辑器性能指标
- **Usage Analytics**: 跟踪功能使用情况
- **User Feedback**: 收集用户反馈

---

## Future Enhancements

### Short-term (3 months)
- PDF 导出支持
- Markdown 导出支持
- 协作编辑（实时协作）
- 版本对比可视化

### Long-term (6-12 months)
- AI 续写功能
- 语法检查和润色
- 多语言翻译
- 语音输入
- 移动端 App
