/**
 * Canvas 历史记录管理 Hook
 * 实现撤销/重做功能
 */

import { useState, useCallback, useEffect, useRef } from "react";
import * as fabric from "fabric";
import { getCanvasJSON } from "./useCanvasObjects";

interface UseCanvasHistoryOptions {
  maxHistorySize?: number;
}

interface CanvasHistoryState {
  canUndo: boolean;
  canRedo: boolean;
  historyIndex: number;
  historyLength: number;
}

export function useCanvasHistory(
  canvas: fabric.Canvas | null,
  options: UseCanvasHistoryOptions = {}
) {
  const { maxHistorySize = 50 } = options;

  const [state, setState] = useState<CanvasHistoryState>({
    canUndo: false,
    canRedo: false,
    historyIndex: -1,
    historyLength: 0,
  });

  // 使用 ref 存储历史记录，避免频繁触发重渲染
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isRestoring = useRef(false);

  // 更新状态
  const updateState = useCallback(() => {
    setState({
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < historyRef.current.length - 1,
      historyIndex: historyIndexRef.current,
      historyLength: historyRef.current.length,
    });
  }, []);

  // 保存当前状态到历史记录
  const saveState = useCallback(() => {
    if (!canvas || isRestoring.current) return;

    // 使用 fabric.js 的 toJSON 方法序列化画布
    const json = JSON.stringify(getCanvasJSON(canvas));

    // 如果当前不在历史记录末尾，删除后面的记录
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }

    // 添加新状态
    historyRef.current.push(json);

    // 限制历史记录大小
    if (historyRef.current.length > maxHistorySize) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }

    updateState();
  }, [canvas, maxHistorySize, updateState]);

  // 撤销
  const undo = useCallback(() => {
    if (!canvas || historyIndexRef.current <= 0) return;

    isRestoring.current = true;
    historyIndexRef.current--;

    const json = historyRef.current[historyIndexRef.current];
    canvas.loadFromJSON(JSON.parse(json)).then(() => {
      canvas.renderAll();
      isRestoring.current = false;
      updateState();
    });
  }, [canvas, updateState]);

  // 重做
  const redo = useCallback(() => {
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;

    isRestoring.current = true;
    historyIndexRef.current++;

    const json = historyRef.current[historyIndexRef.current];
    canvas.loadFromJSON(JSON.parse(json)).then(() => {
      canvas.renderAll();
      isRestoring.current = false;
      updateState();
    });
  }, [canvas, updateState]);

  // 清除历史记录
  const clearHistory = useCallback(() => {
    historyRef.current = [];
    historyIndexRef.current = -1;
    updateState();
  }, [updateState]);

  // 初始化并监听画布变化
  useEffect(() => {
    if (!canvas) return;

    // 保存初始状态
    saveState();

    // 监听画布修改事件
    const handleModified = () => {
      if (!isRestoring.current) {
        saveState();
      }
    };

    canvas.on("object:modified", handleModified);
    canvas.on("object:added", handleModified);
    canvas.on("object:removed", handleModified);

    return () => {
      canvas.off("object:modified", handleModified);
      canvas.off("object:added", handleModified);
      canvas.off("object:removed", handleModified);
    };
  }, [canvas, saveState]);

  return {
    ...state,
    undo,
    redo,
    saveState,
    clearHistory,
  };
}
