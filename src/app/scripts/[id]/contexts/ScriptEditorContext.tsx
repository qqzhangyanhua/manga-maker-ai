"use client";

/**
 * ScriptEditor Context Provider
 * 提供剧本编辑器的全局状态和操作
 * 拆分为 3 个独立 Context 以减少不必要的重渲染
 */

import { createContext, useContext, type ReactNode } from "react";
import type {
  ScriptEditorDataContext,
  ScriptEditorUIContext,
  ScriptEditorOperationsContext,
} from "../types/context.types";

// 创建独立的 Context 以优化渲染性能
const DataContext = createContext<ScriptEditorDataContext | null>(null);
const UIContext = createContext<ScriptEditorUIContext | null>(null);
const OperationsContext = createContext<ScriptEditorOperationsContext | null>(null);

// Context display names for DevTools
DataContext.displayName = "ScriptEditorData";
UIContext.displayName = "ScriptEditorUI";
OperationsContext.displayName = "ScriptEditorOperations";

/**
 * 获取数据上下文
 * 包含 story, panels, chapters, characters 等数据
 */
export function useScriptEditorData(): ScriptEditorDataContext {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useScriptEditorData must be used within ScriptEditorProvider");
  }
  return context;
}

/**
 * 获取 UI 状态上下文
 * 包含 editMode, activeTab, dialogs 等 UI 状态
 */
export function useScriptEditorUI(): ScriptEditorUIContext {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useScriptEditorUI must be used within ScriptEditorProvider");
  }
  return context;
}

/**
 * 获取操作上下文
 * 包含 updateStory, deletePanel 等操作函数
 */
export function useScriptEditorOperations(): ScriptEditorOperationsContext {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error("useScriptEditorOperations must be used within ScriptEditorProvider");
  }
  return context;
}

/**
 * 组合 Hook：一次性获取所有上下文
 * 适用于需要同时访问多个上下文的组件
 */
export function useScriptEditor() {
  return {
    data: useScriptEditorData(),
    ui: useScriptEditorUI(),
    operations: useScriptEditorOperations(),
  };
}

// Provider props
interface ScriptEditorProviderProps {
  children: ReactNode;
  dataValue: ScriptEditorDataContext;
  uiValue: ScriptEditorUIContext;
  operationsValue: ScriptEditorOperationsContext;
}

/**
 * ScriptEditor Provider 组件
 * 将三个独立的 Context 组合在一起
 */
export function ScriptEditorProvider({
  children,
  dataValue,
  uiValue,
  operationsValue,
}: ScriptEditorProviderProps) {
  return (
    <DataContext.Provider value={dataValue}>
      <UIContext.Provider value={uiValue}>
        <OperationsContext.Provider value={operationsValue}>
          {children}
        </OperationsContext.Provider>
      </UIContext.Provider>
    </DataContext.Provider>
  );
}
