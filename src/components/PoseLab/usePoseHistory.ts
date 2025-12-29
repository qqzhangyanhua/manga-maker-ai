import { useState } from "react";
import { PoseData } from "./Mannequin";
import { defaultPose } from "./pose-presets";

/**
 * Custom hook for managing pose history (undo/redo)
 */
export function usePoseHistory(initialPose: PoseData = defaultPose) {
  const [pose, setPose] = useState<PoseData>(initialPose);
  const [poseHistory, setPoseHistory] = useState<PoseData[]>([initialPose]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const updatePoseWithHistory = (newPose: PoseData) => {
    const newHistory = poseHistory.slice(0, historyIndex + 1);
    newHistory.push(newPose);
    setPoseHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setPose(newPose);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPose(poseHistory[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < poseHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPose(poseHistory[newIndex]);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < poseHistory.length - 1;

  return {
    pose,
    updatePoseWithHistory,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  };
}
