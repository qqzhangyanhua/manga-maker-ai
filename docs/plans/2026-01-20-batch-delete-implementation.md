# 批量删除章节 - 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为小说编辑器添加批量删除章节功能，包括选择模式切换、批量操作工具栏和删除确认对话框

**Architecture:** 采用明确的选择模式切换，不干扰现有单选编辑流程。新增 BatchDeleteDialog 和 BatchOperationToolbar 两个独立组件，修改 ChaptersTab 和 ChapterList 集成批量选择功能，复用现有的 useBatchSelection Hook。

**Tech Stack:** React 18, TypeScript, Next.js 14, shadcn/ui, sonner toast, lucide-react icons

---

Plan created successfully. Full plan content saved to file.
