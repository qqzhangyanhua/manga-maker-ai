# Implementation Plan: 小说编辑器增强

## Overview

本实施计划将小说编辑器增强功能分为 4 个阶段，共 6 周完成。优先实现富文本编辑器和基础导出功能，然后逐步完善转漫画流程。每个阶段包含明确的里程碑和验收标准。

---

## Tasks

### Phase 1: 富文本编辑器集成 (Week 1-2)

- [x] 1. 安装和配置 Tiptap
  - 安装 Tiptap 核心库和扩展 (`@tiptap/react`, `@tiptap/starter-kit`)
  - 配置 TypeScript 类型定义
  - 创建基础编辑器配置文件
  - _Requirements: 1.1_

- [ ] 2. 创建 RichTextEditor 组件
  - [x] 2.1 实现基础编辑器组件
    - 创建 `src/components/novel/RichTextEditor.tsx`
    - 实现编辑器初始化逻辑
    - 添加基础扩展（StarterKit, Placeholder, CharacterCount）
    - _Requirements: 1.1, 1.9_

  - [ ]* 2.2 编写 RichTextEditor 单元测试
    - 测试编辑器初始化
    - 测试内容更新
    - 测试字数统计
    - _Requirements: 1.1, 1.9_

  - [x] 2.3 实现浮动工具栏
    - 创建 BubbleMenu 组件
    - 添加格式化按钮（加粗、斜体、下划线、删除线）
    - 实现工具栏显示/隐藏逻辑
    - _Requirements: 1.3, 1.4, 1.5_

  - [ ]* 2.4 编写工具栏交互测试
    - 测试格式化功能
    - 测试快捷键
    - _Requirements: 1.4, 1.5_

- [ ] 3. 实现 Markdown 支持
  - [x] 3.1 集成 Markdown 扩展
    - 安装 `@tiptap/extension-typography`
    - 配置 Markdown 快捷键
    - _Requirements: 1.2, 1.6, 1.7_

  - [ ]* 3.2 编写 Markdown 转换测试
    - 测试 `**加粗**` 转换
    - 测试 `# 标题` 转换
    - 测试 `## 二级标题` 转换
    - _Requirements: 1.2, 1.6, 1.7_

- [ ] 4. 实现字数统计
  - [x] 4.1 创建字数统计组件
    - 创建 `WordCountDisplay` 组件
    - 实时显示字数、段落数、字符数
    - 添加统计动画效果
    - _Requirements: 1.9_

  - [ ]* 4.2 编写字数统计属性测试
    - **Property 7: Word Count Accuracy**
    - **Validates: Requirements 1.9**
    - 测试字数统计准确性（100+ 随机文本）

- [ ] 5. 实现内容序列化
  - [x] 5.1 实现 JSON 序列化/反序列化
    - 创建 `serializeContent` 函数
    - 创建 `deserializeContent` 函数
    - 处理边界情况（空内容、无效 JSON）
    - _Requirements: 11.1, 11.2_

  - [ ]* 5.2 编写序列化属性测试
    - **Property 1: Content Serialization Round Trip**
    - **Validates: Requirements 11.4**
    - 测试序列化往返一致性（100+ 随机内容）

- [ ] 6. 迁移现有章节编辑器
  - [x] 6.1 替换 ChapterEditor 组件
    - 更新 `src/app/(novel)/novel/[id]/components/ChapterEditor.tsx`
    - 集成 RichTextEditor
    - 保持现有 API 兼容性
    - _Requirements: 1.1_

  - [ ] 6.2 数据迁移脚本
    - 创建迁移脚本 `scripts/migrate-chapter-content.ts`
    - 将纯文本转换为 Tiptap JSON
    - 添加回滚机制
    - _Requirements: 11.1, 11.2_

  - [ ]* 6.3 编写迁移测试
    - 测试纯文本→JSON 转换
    - 测试迁移回滚
    - _Requirements: 11.1, 11.2_

- [ ] 7. Checkpoint - 确保编辑器功能正常
  - 确保所有测试通过，询问用户是否有问题

---

### Phase 2: 自动保存与状态管理 (Week 2)

- [ ] 8. 实现自动保存管理器
  - [ ] 8.1 创建 AutoSaveManager 类
    - 创建 `src/lib/novel/auto-save-manager.ts`
    - 实现防抖逻辑（2 秒延迟）
    - 实现重试机制（最多 3 次）
    - _Requirements: 2.1, 2.4_

  - [ ]* 8.2 编写自动保存属性测试
    - **Property 2: Auto Save Idempotence**
    - **Validates: Requirements 2.2, 2.3**
    - 测试保存幂等性（100+ 随机内容）

  - [ ] 8.3 实现离线存储
    - 使用 IndexedDB 存储未保存内容
    - 实现网络状态监听
    - 实现自动同步逻辑
    - _Requirements: 2.6, 2.7_

  - [ ]* 8.4 编写离线存储测试
    - 测试离线保存
    - 测试网络恢复同步
    - _Requirements: 2.6, 2.7_

- [ ] 9. 实现保存状态提示
  - [ ] 9.1 创建 SaveIndicator 组件
    - 创建 `src/components/novel/SaveIndicator.tsx`
    - 显示"保存中..."/"已保存"/"保存失败"状态
    - 添加状态动画
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ] 9.2 集成到编辑器
    - 更新 ChapterEditor 组件
    - 连接 AutoSaveManager 状态
    - _Requirements: 2.2, 2.3_

- [ ] 10. 实现冲突解决
  - [ ] 10.1 创建冲突检测逻辑
    - 比较本地和服务器版本
    - 检测冲突类型（内容冲突、时间戳冲突）
    - _Requirements: 2.8_

  - [ ] 10.2 创建冲突解决对话框
    - 创建 `ConflictResolutionDialog` 组件
    - 显示本地和服务器版本差异
    - 提供解决选项（保留本地、保留服务器、手动合并）
    - _Requirements: 2.8_

  - [ ]* 10.3 编写冲突解决属性测试
    - **Property 8: Conflict Resolution Determinism**
    - **Validates: Requirements 2.8**
    - 测试冲突解决确定性（100+ 随机冲突场景）

- [ ] 11. 实现离开页面确认
  - [ ] 11.1 添加 beforeunload 监听
    - 检测未保存内容
    - 显示浏览器确认对话框
    - _Requirements: 2.5_

  - [ ]* 11.2 编写离开确认测试
    - 测试未保存内容检测
    - 测试确认对话框显示
    - _Requirements: 2.5_

- [ ] 12. Checkpoint - 确保自动保存功能正常
  - 确保所有测试通过，询问用户是否有问题

---

### Phase 3: 导出功能实现 (Week 3)

- [ ] 13. 实现 TXT 导出
  - [ ] 13.1 创建 ExportService 类
    - 创建 `src/lib/novel/export-service.ts`
    - 实现 `exportToTXT` 方法
    - 处理章节合并和分隔符
    - _Requirements: 3.1, 3.3, 3.4_

  - [ ]* 13.2 编写 TXT 导出测试
    - 测试章节合并
    - 测试分隔符插入
    - 测试格式移除
    - _Requirements: 3.3, 3.4, 3.5_

  - [ ] 13.3 实现导出设置
    - 添加编码选择（UTF-8, GBK）
    - 添加换行符选择（\n, \r\n）
    - 添加分隔符自定义
    - _Requirements: 3.2_

  - [ ]* 13.4 编写导出设置测试
    - 测试不同编码
    - 测试不同换行符
    - _Requirements: 3.2_

- [ ] 14. 实现 EPUB 导出
  - [ ] 14.1 集成 epub-gen-memory 库
    - 安装 `epub-gen-memory` 依赖
    - 创建 EPUB 生成配置
    - _Requirements: 4.3_

  - [ ] 14.2 实现 `exportToEPUB` 方法
    - 生成 EPUB 元数据
    - 为每章创建 HTML 页面
    - 生成目录（TOC）
    - _Requirements: 4.3, 4.5, 4.6_

  - [ ]* 14.3 编写 EPUB 导出属性测试
    - **Property 3: Export Format Preservation**
    - **Validates: Requirements 4.4**
    - 测试格式保留（100+ 随机富文本）

  - [ ]* 14.4 编写 EPUB 验证属性测试
    - **Property 9: Export File Validity**
    - **Validates: Requirements 4.7, 4.8**
    - 测试 EPUB 文件有效性（100+ 随机导出）

  - [ ] 14.5 实现封面上传
    - 添加封面图片上传组件
    - 验证图片格式和尺寸
    - 集成到 EPUB 生成
    - _Requirements: 4.2_

  - [ ]* 14.6 编写封面上传测试
    - 测试图片格式验证
    - 测试图片尺寸验证
    - _Requirements: 4.2_

- [ ] 15. 实现章节选择
  - [ ] 15.1 创建章节选择组件
    - 创建 `ChapterSelector` 组件
    - 实现全选/反选功能
    - 实现 Shift+点击 批量选择
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 15.2 编写章节选择属性测试
    - **Property 4: Chapter Selection Consistency**
    - **Validates: Requirements 5.6**
    - 测试章节选择一致性（100+ 随机选择）

  - [ ] 15.3 实现导出文件命名
    - 根据章节范围生成文件名
    - 处理特殊字符
    - _Requirements: 5.7_

  - [ ]* 15.4 编写文件命名测试
    - 测试文件名生成
    - 测试特殊字符处理
    - _Requirements: 5.7_

- [ ] 16. 实现导出预览
  - [ ] 16.1 创建预览组件
    - 创建 `ExportPreview` 组件
    - 实现 TXT 预览
    - 实现 EPUB 预览（使用 iframe）
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 16.2 实现预览内容生成
    - 生成前 3 章预览
    - 支持滚动查看完整内容
    - _Requirements: 9.4, 9.5_

  - [ ]* 16.3 编写预览测试
    - 测试预览内容生成
    - 测试预览显示
    - _Requirements: 9.1, 9.4_

- [ ] 17. 创建导出对话框
  - [ ] 17.1 创建 ExportDialog 组件
    - 创建 `src/app/(novel)/novel/[id]/components/ExportDialog.tsx`
    - 集成格式选择、章节选择、设置、预览
    - 实现导出进度显示
    - _Requirements: 3.1, 3.6, 3.7_

  - [ ] 17.2 实现导出历史记录
    - 创建 `NovelExportHistory` 数据模型
    - 保存导出记录到数据库
    - 显示导出历史列表
    - _Requirements: 3.7_

  - [ ]* 17.3 编写导出对话框集成测试
    - 测试完整导出流程
    - 测试错误处理
    - _Requirements: 3.1, 3.7, 3.8_

- [ ] 18. Checkpoint - 确保导出功能正常
  - 确保所有测试通过，询问用户是否有问题

---

### Phase 4: 小说转漫画功能 (Week 4-5)

- [ ] 19. 实现场景提取
  - [ ] 19.1 创建 ComicConverter 类
    - 创建 `src/lib/novel/comic-converter.ts`
    - 实现 `extractScenes` 方法
    - 使用 LLM 分析章节内容
    - _Requirements: 6.2, 6.3_

  - [ ]* 19.2 编写场景提取属性测试
    - **Property 5: Scene Extraction Completeness**
    - **Validates: Requirements 6.7**
    - 测试场景提取完整性（100+ 随机章节）

  - [ ] 19.3 实现场景描述生成
    - 提取地点、时间、氛围
    - 提取关键视觉元素
    - _Requirements: 6.4, 6.5_

  - [ ]* 19.4 编写场景描述测试
    - 测试地点提取
    - 测试时间提取
    - 测试氛围提取
    - _Requirements: 6.4, 6.5_

  - [ ] 19.5 实现对话提取
    - 识别对话内容
    - 标记说话人
    - _Requirements: 6.6_

  - [ ]* 19.6 编写对话提取测试
    - 测试对话识别
    - 测试说话人标记
    - _Requirements: 6.6_

- [ ] 20. 实现分镜生成
  - [ ] 20.1 实现 `generatePanelSuggestions` 方法
    - 根据场景类型选择镜头类型
    - 估算每场景分镜数量
    - _Requirements: 7.2, 7.6_

  - [ ]* 20.2 编写分镜生成属性测试
    - **Property 10: Panel Count Estimation**
    - **Validates: Requirements 7.6**
    - 测试分镜数量估算范围（100+ 随机场景）

  - [ ] 20.3 实现镜头类型选择
    - 动作场景→动作镜头
    - 对话场景→对话镜头
    - 多角色场景→群像镜头
    - _Requirements: 7.3, 7.4, 7.5_

  - [ ]* 20.4 编写镜头类型测试
    - 测试动作镜头选择
    - 测试对话镜头选择
    - 测试群像镜头选择
    - _Requirements: 7.3, 7.4, 7.5_

  - [ ] 20.5 实现分镜数量调整
    - 允许用户调整分镜数量
    - 重新分配场景内容
    - _Requirements: 7.7_

  - [ ]* 20.6 编写分镜调整测试
    - 测试分镜数量调整
    - 测试内容重新分配
    - _Requirements: 7.7_

- [ ] 21. 实现角色绑定
  - [ ] 21.1 实现 `bindCharacters` 方法
    - 提取小说角色列表
    - 匹配漫画角色
    - 计算匹配置信度
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 21.2 编写角色绑定属性测试
    - **Property 6: Character Binding Uniqueness**
    - **Validates: Requirements 8.6**
    - 测试角色绑定唯一性（100+ 随机绑定）

  - [ ] 21.3 实现角色创建
    - 检测未绑定角色
    - 提供创建新角色选项
    - 使用角色描述生成形象
    - _Requirements: 8.4, 8.5_

  - [ ]* 21.4 编写角色创建测试
    - 测试未绑定角色检测
    - 测试角色形象生成
    - _Requirements: 8.4, 8.5_

  - [ ] 21.5 实现绑定警告
    - 检测未绑定角色
    - 显示警告提示
    - _Requirements: 8.7_

  - [ ]* 21.6 编写绑定警告测试
    - 测试未绑定检测
    - 测试警告显示
    - _Requirements: 8.7_

- [ ] 22. 创建转换对话框
  - [ ] 22.1 更新 ConvertToComicDialog 组件
    - 更新 `src/app/(novel)/novel/[id]/components/ConvertToComicDialog.tsx`
    - 集成场景提取、分镜生成、角色绑定
    - 实现转换进度显示
    - _Requirements: 6.1, 7.1, 8.2_

  - [ ] 22.2 实现场景审核界面
    - 显示提取的场景列表
    - 允许编辑场景描述
    - _Requirements: 6.7, 6.8_

  - [ ]* 22.3 编写转换对话框集成测试
    - 测试完整转换流程
    - 测试错误处理
    - _Requirements: 6.1, 7.1, 8.2_

- [ ] 23. 实现分镜项目创建
  - [ ] 23.1 实现 `createStoryboardProject` 方法
    - 创建 Story 记录
    - 创建 Panel 记录
    - 设置 `source_novel_id` 关联
    - _Requirements: 7.8_

  - [ ] 23.2 创建转换映射记录
    - 创建 `NovelComicMapping` 数据模型
    - 保存章节映射、场景映射、角色绑定
    - _Requirements: 7.8_

  - [ ]* 23.3 编写项目创建测试
    - 测试 Story 创建
    - 测试 Panel 创建
    - 测试映射记录创建
    - _Requirements: 7.8_

- [ ] 24. Checkpoint - 确保转漫画功能正常
  - 确保所有测试通过，询问用户是否有问题

---

### Phase 5: 性能优化与测试 (Week 6)

- [ ] 25. 编辑器性能优化
  - [ ] 25.1 实现虚拟滚动
    - 检测章节长度
    - 启用虚拟滚动（>5000 字）
    - _Requirements: 10.1_

  - [ ] 25.2 优化输入响应
    - 测量输入延迟
    - 优化到 16ms 以内（60fps）
    - _Requirements: 10.2_

  - [ ] 25.3 优化粘贴处理
    - 分批处理大量文本
    - 避免阻塞 UI
    - _Requirements: 10.3_

  - [ ] 25.4 优化初始化
    - 延迟加载非关键扩展
    - 优化到 500ms 以内
    - _Requirements: 10.4_

  - [ ] 25.5 优化内存使用
    - 监控内存使用
    - 清理编辑器实例
    - 显示性能警告
    - _Requirements: 10.6, 10.7_

  - [ ]* 25.6 编写性能测试
    - 测试初始化时间
    - 测试输入响应时间
    - 测试内存使用
    - _Requirements: 10.1, 10.2, 10.4, 10.6_

- [ ] 26. 导出性能优化
  - [ ] 26.1 实现流式导出
    - 使用流式处理大文件
    - 避免内存溢出
    - _Requirements: 3.6_

  - [ ] 26.2 使用 Web Worker
    - 将 EPUB 生成移到 Worker
    - 避免阻塞主线程
    - _Requirements: 4.3_

  - [ ] 26.3 实现结果缓存
    - 缓存章节内容
    - 避免重复查询
    - _Requirements: 3.6_

  - [ ]* 26.4 编写导出性能测试
    - 测试大文件导出时间
    - 测试内存使用
    - _Requirements: 3.6_

- [ ] 27. 转换性能优化
  - [ ] 27.1 实现批量处理
    - 批量提取场景
    - 减少 API 调用次数
    - _Requirements: 6.2_

  - [ ] 27.2 实现并行请求
    - 并行调用 LLM API
    - 减少总耗时
    - _Requirements: 6.2_

  - [ ] 27.3 实现结果缓存
    - 缓存场景提取结果
    - 避免重复分析
    - _Requirements: 6.7_

  - [ ]* 27.4 编写转换性能测试
    - 测试场景提取时间
    - 测试分镜生成时间
    - _Requirements: 6.2, 7.2_

- [ ] 28. 集成测试
  - [ ]* 28.1 编写编辑器集成测试
    - 测试编辑→自动保存→加载流程
    - _Requirements: 1.1, 2.1_

  - [ ]* 28.2 编写导出集成测试
    - 测试导出→预览→下载流程
    - _Requirements: 3.1, 9.1_

  - [ ]* 28.3 编写转换集成测试
    - 测试转换→创建分镜项目流程
    - _Requirements: 6.1, 7.8_

- [ ] 29. E2E 测试
  - [ ]* 29.1 编写编辑流程 E2E 测试
    - 用户创建章节→编辑内容→自动保存→导出 EPUB
    - _Requirements: 1.1, 2.1, 4.3_

  - [ ]* 29.2 编写转换流程 E2E 测试
    - 用户编辑章节→转漫画→查看分镜→生成图片
    - _Requirements: 6.1, 7.8_

- [ ] 30. Bug 修复与优化
  - 修复测试中发现的 Bug
  - 优化用户体验
  - 完善错误提示

- [ ] 31. Final Checkpoint - 确保所有功能正常
  - 确保所有测试通过，询问用户是否有问题

---

## Notes

- 标记 `*` 的任务为可选测试任务，可根据时间调整
- 每个 Checkpoint 需要确保所有测试通过
- 属性测试最少运行 100 次迭代
- 集成测试和 E2E 测试在最后阶段统一执行
- 性能优化根据实际测试结果调整优先级

---

## Milestones

### Milestone 1: 富文本编辑器可用 (Week 2)
- ✅ Tiptap 编辑器集成完成
- ✅ 自动保存功能正常
- ✅ 现有章节迁移完成
- ✅ 基础测试通过

### Milestone 2: 导出功能可用 (Week 3)
- ✅ TXT 导出功能完成
- ✅ EPUB 导出功能完成
- ✅ 章节选择功能完成
- ✅ 导出预览功能完成
- ✅ 导出测试通过

### Milestone 3: 转漫画功能可用 (Week 5)
- ✅ 场景提取功能完成
- ✅ 分镜生成功能完成
- ✅ 角色绑定功能完成
- ✅ 转换测试通过

### Milestone 4: 产品发布 (Week 6)
- ✅ 所有功能测试通过
- ✅ 性能优化完成
- ✅ Bug 修复完成
- ✅ 用户测试通过

---

## Risk Management

### High Risk
1. **Tiptap 性能问题** - 大文件编辑可能卡顿
   - 缓解措施：实现虚拟滚动、延迟加载

2. **EPUB 生成失败** - 复杂格式可能导致生成失败
   - 缓解措施：充分测试、提供降级方案

3. **LLM API 不稳定** - 场景提取可能失败
   - 缓解措施：实现重试机制、提供手动编辑

### Medium Risk
1. **数据迁移失败** - 纯文本→JSON 转换可能出错
   - 缓解措施：充分测试、提供回滚机制

2. **冲突解决复杂** - 多设备编辑可能冲突
   - 缓解措施：实现清晰的冲突解决流程

### Low Risk
1. **UI 兼容性问题** - 不同浏览器可能显示不一致
   - 缓解措施：跨浏览器测试

---

## Success Criteria

### Functional
- ✅ 富文本编辑器支持基础格式化
- ✅ 自动保存成功率 > 99.9%
- ✅ TXT/EPUB 导出成功率 > 99%
- ✅ 转漫画流程完整打通

### Performance
- ✅ 编辑器初始化 < 500ms
- ✅ 自动保存响应 < 1s
- ✅ 导出 10 万字 < 5s
- ✅ 转漫画分析 1 万字 < 10s

### Quality
- ✅ 单元测试覆盖率 > 80%
- ✅ 属性测试通过率 100%
- ✅ 集成测试通过率 100%
- ✅ E2E 测试通过率 100%

### User Experience
- ✅ 新用户完成首次导出 < 5 分钟
- ✅ 编辑器学习曲线 < 10 分钟
- ✅ 转漫画流程完成 < 15 分钟
- ✅ 用户满意度 > 4.5/5
