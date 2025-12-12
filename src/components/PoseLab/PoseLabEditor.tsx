import { useState, Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import Mannequin, { PoseData } from "./Mannequin";
import { Button } from "@/components/ui/button";
import { RotateCcw, Save, Sparkles, Loader2, Undo, Redo, FlipHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { poseToDescription, getPresetPoseDescription } from "@/lib/pose-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Character = {
  id: string;
  name: string;
  description: string | null;
  base_image_url: string | null;
};

const defaultPose: PoseData = {
  head: [0, 2.0, 0],
  neck: [0, 1.7, 0],
  chest: [0, 1.3, 0],
  hips: [0, 0.9, 0],
  leftShoulder: [-0.3, 1.6, 0],
  leftElbow: [-0.5, 1.2, 0],
  leftWrist: [-0.7, 0.9, 0],
  rightShoulder: [0.3, 1.6, 0],
  rightElbow: [0.5, 1.2, 0],
  rightWrist: [0.7, 0.9, 0],
  leftHip: [-0.15, 0.9, 0],
  leftKnee: [-0.15, 0.5, 0],
  leftAnkle: [-0.15, 0.1, 0],
  rightHip: [0.15, 0.9, 0],
  rightKnee: [0.15, 0.5, 0],
  rightAnkle: [0.15, 0.1, 0],
};

const presetPoses: { name: string; pose: PoseData }[] = [
  {
    name: "站立",
    pose: defaultPose,
  },
  {
    name: "战斗姿态",
    pose: {
      ...defaultPose,
      leftElbow: [-0.6, 1.4, 0.2],
      leftWrist: [-0.4, 1.6, 0.3],
      rightElbow: [0.6, 1.3, 0.1],
      rightWrist: [0.8, 1.1, 0.2],
      leftKnee: [-0.3, 0.5, 0.2],
      rightKnee: [0.3, 0.4, -0.1],
    },
  },
  {
    name: "奔跑",
    pose: {
      ...defaultPose,
      leftElbow: [-0.3, 1.2, 0.4],
      leftWrist: [-0.2, 1.0, 0.5],
      rightElbow: [0.4, 1.3, -0.3],
      rightWrist: [0.5, 1.5, -0.2],
      leftKnee: [-0.3, 0.6, 0.3],
      leftAnkle: [-0.4, 0.2, 0.4],
      rightKnee: [0.2, 0.4, -0.2],
      rightAnkle: [0.1, 0.1, -0.3],
    },
  },
  {
    name: "思考",
    pose: {
      ...defaultPose,
      head: [0, 2.0, -0.1],
      rightElbow: [0.4, 1.5, 0.2],
      rightWrist: [0.2, 1.8, 0.1],
      leftElbow: [-0.4, 1.0, 0.1],
      leftWrist: [-0.3, 0.8, 0.2],
    },
  },
  {
    name: "坐姿",
    pose: {
      ...defaultPose,
      hips: [0, 0.6, 0],
      chest: [0, 1.0, 0],
      neck: [0, 1.4, 0],
      head: [0, 1.7, 0],
      leftHip: [-0.15, 0.6, 0],
      rightHip: [0.15, 0.6, 0],
      leftKnee: [-0.15, 0.3, 0.3],
      rightKnee: [0.15, 0.3, 0.3],
      leftAnkle: [-0.15, 0.05, 0.4],
      rightAnkle: [0.15, 0.05, 0.4],
      leftShoulder: [-0.3, 1.3, 0],
      rightShoulder: [0.3, 1.3, 0],
      leftElbow: [-0.35, 0.9, 0.1],
      rightElbow: [0.35, 0.9, 0.1],
      leftWrist: [-0.25, 0.7, 0.15],
      rightWrist: [0.25, 0.7, 0.15],
    },
  },
  {
    name: "跳跃",
    pose: {
      ...defaultPose,
      head: [0, 2.3, 0],
      neck: [0, 2.0, 0],
      chest: [0, 1.6, 0],
      hips: [0, 1.2, 0],
      leftShoulder: [-0.35, 1.9, 0],
      leftElbow: [-0.5, 2.2, 0.1],
      leftWrist: [-0.6, 2.4, 0.15],
      rightShoulder: [0.35, 1.9, 0],
      rightElbow: [0.5, 2.2, 0.1],
      rightWrist: [0.6, 2.4, 0.15],
      leftHip: [-0.15, 1.2, 0],
      leftKnee: [-0.2, 0.9, 0.1],
      leftAnkle: [-0.15, 0.7, 0.15],
      rightHip: [0.15, 1.2, 0],
      rightKnee: [0.2, 0.9, 0.1],
      rightAnkle: [0.15, 0.7, 0.15],
    },
  },
  {
    name: "防御",
    pose: {
      ...defaultPose,
      head: [0, 2.0, -0.05],
      chest: [0, 1.3, -0.05],
      leftShoulder: [-0.25, 1.6, 0.15],
      leftElbow: [-0.15, 1.4, 0.3],
      leftWrist: [0, 1.5, 0.35],
      rightShoulder: [0.25, 1.6, 0.15],
      rightElbow: [0.15, 1.4, 0.3],
      rightWrist: [0, 1.5, 0.35],
      leftKnee: [-0.2, 0.45, 0.15],
      rightKnee: [0.2, 0.45, 0.15],
    },
  },
  {
    name: "攻击",
    pose: {
      ...defaultPose,
      chest: [0, 1.3, 0.1],
      head: [0, 2.0, 0.1],
      leftShoulder: [-0.3, 1.6, 0],
      leftElbow: [-0.5, 1.4, 0],
      leftWrist: [-0.7, 1.2, 0],
      rightShoulder: [0.2, 1.6, 0.2],
      rightElbow: [0.3, 1.4, 0.5],
      rightWrist: [0.4, 1.5, 0.7],
      leftKnee: [-0.2, 0.5, 0.2],
      rightKnee: [0.25, 0.45, -0.15],
    },
  },
  {
    name: "行走",
    pose: {
      ...defaultPose,
      leftElbow: [-0.4, 1.3, 0.3],
      leftWrist: [-0.35, 1.0, 0.4],
      rightElbow: [0.5, 1.4, -0.2],
      rightWrist: [0.55, 1.1, -0.3],
      leftKnee: [-0.15, 0.55, 0.2],
      leftAnkle: [-0.15, 0.15, 0.3],
      rightKnee: [0.2, 0.45, -0.1],
      rightAnkle: [0.25, 0.05, -0.15],
    },
  },
  {
    name: "跪下",
    pose: {
      ...defaultPose,
      hips: [0, 0.5, 0],
      chest: [0, 0.9, 0],
      neck: [0, 1.3, 0],
      head: [0, 1.6, 0],
      leftHip: [-0.15, 0.5, 0],
      rightHip: [0.15, 0.5, 0],
      leftKnee: [-0.15, 0.15, 0],
      leftAnkle: [-0.15, 0.05, -0.2],
      rightKnee: [0.2, 0.25, 0.2],
      rightAnkle: [0.25, 0.05, 0.35],
      leftShoulder: [-0.3, 1.2, 0],
      rightShoulder: [0.3, 1.2, 0],
      leftElbow: [-0.4, 0.85, 0],
      rightElbow: [0.4, 0.85, 0],
      leftWrist: [-0.3, 0.6, 0.1],
      rightWrist: [0.3, 0.6, 0.1],
    },
  },
  {
    name: "指向",
    pose: {
      ...defaultPose,
      rightShoulder: [0.3, 1.6, 0],
      rightElbow: [0.5, 1.5, 0.3],
      rightWrist: [0.7, 1.5, 0.5],
      leftElbow: [-0.4, 1.1, 0],
      leftWrist: [-0.3, 0.9, 0.1],
    },
  },
  {
    name: "挥手",
    pose: {
      ...defaultPose,
      rightShoulder: [0.35, 1.6, 0],
      rightElbow: [0.5, 1.9, 0.1],
      rightWrist: [0.4, 2.1, 0.15],
      leftElbow: [-0.4, 1.1, 0],
      leftWrist: [-0.3, 0.9, 0.1],
    },
  },
  {
    name: "胜利",
    pose: {
      ...defaultPose,
      leftShoulder: [-0.35, 1.6, 0],
      leftElbow: [-0.45, 1.9, 0.1],
      leftWrist: [-0.4, 2.2, 0.15],
      rightShoulder: [0.35, 1.6, 0],
      rightElbow: [0.45, 1.9, 0.1],
      rightWrist: [0.4, 2.2, 0.15],
      leftKnee: [-0.2, 0.5, 0.05],
      rightKnee: [0.2, 0.5, 0.05],
    },
  },
  {
    name: "交叉手臂",
    pose: {
      ...defaultPose,
      leftShoulder: [-0.3, 1.6, 0],
      leftElbow: [-0.15, 1.3, 0.15],
      leftWrist: [0.15, 1.2, 0.2],
      rightShoulder: [0.3, 1.6, 0],
      rightElbow: [0.15, 1.3, 0.15],
      rightWrist: [-0.15, 1.2, 0.2],
    },
  },
  {
    name: "俯身",
    pose: {
      ...defaultPose,
      head: [0, 1.8, 0.3],
      neck: [0, 1.5, 0.25],
      chest: [0, 1.2, 0.2],
      hips: [0, 0.9, 0.1],
      leftShoulder: [-0.3, 1.4, 0.2],
      rightShoulder: [0.3, 1.4, 0.2],
      leftElbow: [-0.4, 1.1, 0.3],
      rightElbow: [0.4, 1.1, 0.3],
      leftWrist: [-0.35, 0.8, 0.4],
      rightWrist: [0.35, 0.8, 0.4],
    },
  },
  {
    name: "躺下",
    pose: {
      head: [0, 0.4, 0.15],
      neck: [0, 0.35, 0.1],
      chest: [0, 0.3, 0],
      hips: [0, 0.25, -0.1],
      leftShoulder: [-0.3, 0.35, 0],
      leftElbow: [-0.4, 0.3, 0.1],
      leftWrist: [-0.5, 0.25, 0.15],
      rightShoulder: [0.3, 0.35, 0],
      rightElbow: [0.4, 0.3, 0.1],
      rightWrist: [0.5, 0.25, 0.15],
      leftHip: [-0.15, 0.25, -0.1],
      leftKnee: [-0.15, 0.2, -0.25],
      leftAnkle: [-0.15, 0.15, -0.4],
      rightHip: [0.15, 0.25, -0.1],
      rightKnee: [0.15, 0.2, -0.25],
      rightAnkle: [0.15, 0.15, -0.4],
    },
  },
  {
    name: "飞行",
    pose: {
      ...defaultPose,
      head: [0, 2.1, 0.1],
      neck: [0, 1.8, 0.1],
      chest: [0, 1.4, 0.05],
      hips: [0, 1.0, 0],
      leftShoulder: [-0.4, 1.7, 0.1],
      leftElbow: [-0.6, 1.6, 0.2],
      leftWrist: [-0.8, 1.5, 0.3],
      rightShoulder: [0.4, 1.7, 0.1],
      rightElbow: [0.6, 1.6, 0.2],
      rightWrist: [0.8, 1.5, 0.3],
      leftHip: [-0.15, 1.0, 0],
      leftKnee: [-0.2, 0.7, -0.15],
      leftAnkle: [-0.25, 0.5, -0.25],
      rightHip: [0.15, 1.0, 0],
      rightKnee: [0.2, 0.7, -0.15],
      rightAnkle: [0.25, 0.5, -0.25],
    },
  },
  {
    name: "倒地",
    pose: {
      head: [0, 0.5, 0.2],
      neck: [0, 0.45, 0.15],
      chest: [0, 0.4, 0.05],
      hips: [0, 0.35, -0.05],
      leftShoulder: [-0.35, 0.45, 0.1],
      leftElbow: [-0.5, 0.35, 0.2],
      leftWrist: [-0.6, 0.25, 0.25],
      rightShoulder: [0.3, 0.45, 0.05],
      rightElbow: [0.45, 0.3, 0.15],
      rightWrist: [0.55, 0.2, 0.2],
      leftHip: [-0.2, 0.35, -0.05],
      leftKnee: [-0.3, 0.25, -0.2],
      leftAnkle: [-0.35, 0.15, -0.35],
      rightHip: [0.15, 0.35, -0.1],
      rightKnee: [0.25, 0.2, -0.25],
      rightAnkle: [0.3, 0.1, -0.4],
    },
  },
  {
    name: "投掷",
    pose: {
      ...defaultPose,
      chest: [0, 1.35, -0.1],
      head: [0, 2.05, -0.05],
      leftShoulder: [-0.35, 1.6, -0.1],
      leftElbow: [-0.5, 1.4, -0.05],
      leftWrist: [-0.6, 1.2, 0],
      rightShoulder: [0.25, 1.7, 0.15],
      rightElbow: [0.35, 1.9, 0.3],
      rightWrist: [0.45, 2.0, 0.5],
      leftKnee: [-0.25, 0.5, 0.15],
      rightKnee: [0.2, 0.45, -0.1],
    },
  },
  {
    name: "后仰",
    pose: {
      ...defaultPose,
      head: [0, 2.05, -0.2],
      neck: [0, 1.75, -0.15],
      chest: [0, 1.35, -0.1],
      hips: [0, 0.95, -0.05],
      leftShoulder: [-0.35, 1.65, -0.1],
      leftElbow: [-0.5, 1.5, 0.1],
      leftWrist: [-0.6, 1.4, 0.2],
      rightShoulder: [0.35, 1.65, -0.1],
      rightElbow: [0.5, 1.5, 0.1],
      rightWrist: [0.6, 1.4, 0.2],
      leftKnee: [-0.2, 0.48, 0.1],
      rightKnee: [0.2, 0.48, 0.1],
    },
  },
  {
    name: "蹲下",
    pose: {
      ...defaultPose,
      hips: [0, 0.5, 0],
      chest: [0, 0.85, 0.05],
      neck: [0, 1.15, 0.05],
      head: [0, 1.45, 0.05],
      leftHip: [-0.15, 0.5, 0],
      rightHip: [0.15, 0.5, 0],
      leftKnee: [-0.2, 0.25, 0.15],
      leftAnkle: [-0.2, 0.05, 0.25],
      rightKnee: [0.2, 0.25, 0.15],
      rightAnkle: [0.2, 0.05, 0.25],
      leftShoulder: [-0.3, 1.1, 0.05],
      rightShoulder: [0.3, 1.1, 0.05],
      leftElbow: [-0.35, 0.75, 0.1],
      rightElbow: [0.35, 0.75, 0.1],
      leftWrist: [-0.25, 0.55, 0.15],
      rightWrist: [0.25, 0.55, 0.15],
    },
  },
  {
    name: "祈祷",
    pose: {
      ...defaultPose,
      head: [0, 2.0, -0.15],
      leftShoulder: [-0.28, 1.6, 0],
      leftElbow: [-0.2, 1.35, 0.15],
      leftWrist: [0, 1.4, 0.2],
      rightShoulder: [0.28, 1.6, 0],
      rightElbow: [0.2, 1.35, 0.15],
      rightWrist: [0, 1.4, 0.2],
    },
  },
  {
    name: "张开双臂",
    pose: {
      ...defaultPose,
      leftShoulder: [-0.4, 1.6, 0],
      leftElbow: [-0.7, 1.55, 0.05],
      leftWrist: [-0.95, 1.5, 0.1],
      rightShoulder: [0.4, 1.6, 0],
      rightElbow: [0.7, 1.55, 0.05],
      rightWrist: [0.95, 1.5, 0.1],
    },
  },
  {
    name: "推",
    pose: {
      ...defaultPose,
      chest: [0, 1.3, 0.1],
      leftShoulder: [-0.3, 1.6, 0.1],
      leftElbow: [-0.25, 1.4, 0.3],
      leftWrist: [-0.2, 1.3, 0.5],
      rightShoulder: [0.3, 1.6, 0.1],
      rightElbow: [0.25, 1.4, 0.3],
      rightWrist: [0.2, 1.3, 0.5],
      leftKnee: [-0.2, 0.48, 0.15],
      rightKnee: [0.2, 0.48, 0.15],
    },
  },
  {
    name: "拉",
    pose: {
      ...defaultPose,
      chest: [0, 1.3, -0.1],
      leftShoulder: [-0.3, 1.6, -0.05],
      leftElbow: [-0.4, 1.35, 0.1],
      leftWrist: [-0.35, 1.15, 0.2],
      rightShoulder: [0.3, 1.6, -0.05],
      rightElbow: [0.4, 1.35, 0.1],
      rightWrist: [0.35, 1.15, 0.2],
      leftKnee: [-0.2, 0.48, -0.15],
      rightKnee: [0.2, 0.48, -0.15],
    },
  },
  {
    name: "爬行",
    pose: {
      head: [0, 1.0, 0.2],
      neck: [0, 0.9, 0.15],
      chest: [0, 0.75, 0.1],
      hips: [0, 0.55, 0],
      leftShoulder: [-0.3, 0.8, 0.15],
      leftElbow: [-0.4, 0.5, 0.3],
      leftWrist: [-0.45, 0.15, 0.45],
      rightShoulder: [0.3, 0.8, 0.15],
      rightElbow: [0.4, 0.5, 0.3],
      rightWrist: [0.45, 0.15, 0.45],
      leftHip: [-0.15, 0.55, 0],
      leftKnee: [-0.2, 0.3, -0.15],
      leftAnkle: [-0.2, 0.1, -0.3],
      rightHip: [0.15, 0.55, 0],
      rightKnee: [0.2, 0.3, -0.15],
      rightAnkle: [0.2, 0.1, -0.3],
    },
  },
  {
    name: "侧身",
    pose: {
      head: [0.1, 2.0, 0],
      neck: [0.05, 1.7, 0],
      chest: [0, 1.3, 0],
      hips: [-0.05, 0.9, 0],
      leftShoulder: [-0.25, 1.6, 0.1],
      leftElbow: [-0.35, 1.3, 0.15],
      leftWrist: [-0.4, 1.0, 0.2],
      rightShoulder: [0.35, 1.6, -0.1],
      rightElbow: [0.5, 1.3, -0.15],
      rightWrist: [0.6, 1.0, -0.2],
      leftHip: [-0.1, 0.9, 0.05],
      leftKnee: [-0.1, 0.5, 0.1],
      leftAnkle: [-0.1, 0.1, 0.1],
      rightHip: [0.2, 0.9, -0.05],
      rightKnee: [0.2, 0.5, -0.05],
      rightAnkle: [0.2, 0.1, -0.05],
    },
  },
  {
    name: "下腰",
    pose: {
      head: [0, 1.3, 0.4],
      neck: [0, 1.15, 0.35],
      chest: [0, 0.95, 0.25],
      hips: [0, 0.75, 0.1],
      leftShoulder: [-0.3, 1.05, 0.3],
      leftElbow: [-0.35, 0.7, 0.4],
      leftWrist: [-0.3, 0.4, 0.5],
      rightShoulder: [0.3, 1.05, 0.3],
      rightElbow: [0.35, 0.7, 0.4],
      rightWrist: [0.3, 0.4, 0.5],
      leftHip: [-0.15, 0.75, 0.05],
      leftKnee: [-0.15, 0.45, 0],
      leftAnkle: [-0.15, 0.1, 0],
      rightHip: [0.15, 0.75, 0.05],
      rightKnee: [0.15, 0.45, 0],
      rightAnkle: [0.15, 0.1, 0],
    },
  },
  {
    name: "冲刺",
    pose: {
      ...defaultPose,
      head: [0, 2.0, 0.15],
      chest: [0, 1.35, 0.15],
      hips: [0, 0.95, 0.1],
      leftShoulder: [-0.3, 1.6, 0.1],
      leftElbow: [-0.25, 1.2, 0.35],
      leftWrist: [-0.2, 0.9, 0.5],
      rightShoulder: [0.3, 1.65, 0],
      rightElbow: [0.45, 1.5, -0.25],
      rightWrist: [0.5, 1.3, -0.4],
      leftKnee: [-0.3, 0.65, 0.3],
      leftAnkle: [-0.35, 0.25, 0.45],
      rightKnee: [0.25, 0.4, -0.2],
      rightAnkle: [0.2, 0.08, -0.35],
    },
  },
];

interface PoseLabEditorProps {
  onGenerateWithPose?: (pose: PoseData) => void;
}

const PoseLabEditor = ({ onGenerateWithPose }: PoseLabEditorProps) => {
  const [pose, setPose] = useState<PoseData>(defaultPose);
  const [selectedPreset, setSelectedPreset] = useState<string>("站立");

  // 历史记录管理（撤销/重做）
  const [poseHistory, setPoseHistory] = useState<PoseData[]>([defaultPose]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{
    url: string;
    poseName: string;
    poseDescription: string;
  } | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
  const { toast } = useToast();

  // 更新姿势并记录到历史
  const updatePoseWithHistory = (newPose: PoseData) => {
    const newHistory = poseHistory.slice(0, historyIndex + 1);
    newHistory.push(newPose);
    setPoseHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setPose(newPose);
  };

  // 撤销
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPose(poseHistory[newIndex]);
    }
  };

  // 重做
  const handleRedo = () => {
    if (historyIndex < poseHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPose(poseHistory[newIndex]);
    }
  };

  // 镜像翻转
  const handleMirror = () => {
    const mirroredPose: PoseData = {
      ...pose,
      // 翻转左右肩膀
      leftShoulder: [-pose.rightShoulder[0], pose.rightShoulder[1], pose.rightShoulder[2]],
      rightShoulder: [-pose.leftShoulder[0], pose.leftShoulder[1], pose.leftShoulder[2]],
      // 翻转左右肘部
      leftElbow: [-pose.rightElbow[0], pose.rightElbow[1], pose.rightElbow[2]],
      rightElbow: [-pose.leftElbow[0], pose.leftElbow[1], pose.leftElbow[2]],
      // 翻转左右手腕
      leftWrist: [-pose.rightWrist[0], pose.rightWrist[1], pose.rightWrist[2]],
      rightWrist: [-pose.leftWrist[0], pose.leftWrist[1], pose.leftWrist[2]],
      // 翻转左右髋部
      leftHip: [-pose.rightHip[0], pose.rightHip[1], pose.rightHip[2]],
      rightHip: [-pose.leftHip[0], pose.leftHip[1], pose.leftHip[2]],
      // 翻转左右膝盖
      leftKnee: [-pose.rightKnee[0], pose.rightKnee[1], pose.rightKnee[2]],
      rightKnee: [-pose.leftKnee[0], pose.leftKnee[1], pose.leftKnee[2]],
      // 翻转左右脚踝
      leftAnkle: [-pose.rightAnkle[0], pose.rightAnkle[1], pose.rightAnkle[2]],
      rightAnkle: [-pose.leftAnkle[0], pose.leftAnkle[1], pose.leftAnkle[2]],
    };
    updatePoseWithHistory(mirroredPose);
    toast({
      title: "姿势已镜像",
      description: "左右身体部位已翻转",
    });
  };

  // 保存姿势
  const handleSave = () => {
    try {
      const savedPoses = JSON.parse(localStorage.getItem("customPoses") || "[]");
      const poseName = `自定义姿势_${new Date().toLocaleString("zh-CN")}`;
      savedPoses.push({
        name: poseName,
        pose,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("customPoses", JSON.stringify(savedPoses));
      toast({
        title: "姿势已保存",
        description: `"${poseName}" 已保存到浏览器本地`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "保存失败",
        description: error instanceof Error ? error.message : "无法保存姿势",
      });
    }
  };

  // 加载用户的角色列表
  useEffect(() => {
    const loadCharacters = async () => {
      setIsLoadingCharacters(true);
      try {
        const response = await fetch("/api/character");
        if (!response.ok) {
          throw new Error("加载角色列表失败");
        }
        const data = await response.json();
        setCharacters(data.characters || []);
      } catch (error) {
        console.error("Failed to load characters:", error);
        toast({
          variant: "destructive",
          title: "加载失败",
          description: error instanceof Error ? error.message : "无法加载角色列表",
        });
      } finally {
        setIsLoadingCharacters(false);
      }
    };
    loadCharacters();
  }, [toast]);

  const handleReset = () => {
    updatePoseWithHistory(defaultPose);
    setSelectedPreset("站立");
  };

  const handlePresetSelect = (preset: { name: string; pose: PoseData }) => {
    updatePoseWithHistory(preset.pose);
    setSelectedPreset(preset.name);
  };

  const handleGenerate = () => {
    // 检查是否有角色可用
    if (characters.length === 0) {
      toast({
        variant: "destructive",
        title: "没有可用角色",
        description: "请先在角色库中创建至少一个角色",
      });
      return;
    }

    // 打开生成对话框
    setShowGenerateDialog(true);
  };

  const handleConfirmGenerate = async () => {
    if (!selectedCharacterId) {
      toast({
        variant: "destructive",
        title: "请选择角色",
        description: "请先选择要生成的角色",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // 生成姿势描述
      const poseDescription = selectedPreset
        ? getPresetPoseDescription(selectedPreset)
        : poseToDescription(pose);

      // 调用姿势变体生成 API（保存为独立变体，不覆盖三视图）
      const selectedCharacter = characters.find((c) => c.id === selectedCharacterId);

      const response = await fetch("/api/character/generate-pose-variant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: selectedCharacterId,
          pose_description: poseDescription,
          pose_name: selectedPreset || "自定义姿势",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "生成失败");
      }

      const data = await response.json();

      // 设置生成的图片数据并打开预览对话框
      setGeneratedImage({
        url: data.image.image_url,
        poseName: data.image.pose_name,
        poseDescription: data.image.pose_description,
      });
      setShowPreviewDialog(true);

      toast({
        title: "姿势变体生成成功",
        description: `已为角色"${selectedCharacter?.name}"生成"${data.image.pose_name}"姿势变体`,
      });

      // 关闭生成对话框
      setShowGenerateDialog(false);
      setSelectedCharacterId("");

      // 调用回调（如果有）
      if (onGenerateWithPose) {
        onGenerateWithPose(pose);
      }
    } catch (error) {
      console.error("Generate error:", error);
      toast({
        variant: "destructive",
        title: "生成失败",
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="h-full flex flex-col lg:flex-row gap-4">
        {/* 3D Canvas */}
        <div className="flex-1 comic-card overflow-hidden rounded-xl min-h-[400px]">
          <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
            <Suspense fallback={null}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
              <pointLight position={[-5, 5, -5]} intensity={0.5} />

              <Mannequin pose={pose} onPoseChange={updatePoseWithHistory} />

              <Grid
                args={[10, 10]}
                cellSize={0.5}
                cellThickness={0.5}
                cellColor="#374151"
                sectionSize={2}
                sectionThickness={1}
                sectionColor="#6b7280"
                fadeDistance={10}
                fadeStrength={1}
                position={[0, 0, 0]}
              />

              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={2}
                maxDistance={10}
              />

              <Environment preset="studio" />
            </Suspense>
          </Canvas>
        </div>

        {/* Controls Panel */}
        <div className="w-full lg:w-80 space-y-4">
          {/* Preset Poses */}
          <div className="comic-card p-4">
            <h3 className="font-comic text-lg text-foreground mb-3">预设姿势</h3>
            <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
              {presetPoses.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetSelect(preset)}
                  className={cn(
                    "px-2 py-2 rounded-lg text-xs font-semibold transition-all",
                    "border-2",
                    selectedPreset === preset.name
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="comic-card p-4">
            <h3 className="font-comic text-lg text-foreground mb-3">操作说明</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>点击关节点选择，出现控制器</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>拖动控制器的箭头调整关节位置</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>鼠标拖拽旋转视角</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>滚轮缩放画面</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>右键平移画面</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>使用撤销/重做调整编辑历史</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              variant="comic"
              className="w-full"
              onClick={handleGenerate}
              disabled={isLoadingCharacters}
            >
              {isLoadingCharacters ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  加载角色中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  使用此姿势生成
                </>
              )}
            </Button>

            {/* 编辑操作 */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="撤销"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={handleRedo}
                disabled={historyIndex >= poseHistory.length - 1}
                title="重做"
              >
                <Redo className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={handleMirror} title="镜像翻转">
                <FlipHorizontal className="w-4 h-4" />
              </Button>
            </div>

            {/* 保存和重置 */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
                重置
              </Button>
              <Button variant="outline" onClick={handleSave}>
                <Save className="w-4 h-4" />
                保存
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>使用此姿势生成角色图片</DialogTitle>
            <DialogDescription>
              选择一个角色，系统将生成该角色在当前姿势下的图片
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">选择角色</label>
              <Select value={selectedCharacterId} onValueChange={setSelectedCharacterId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择一个角色" />
                </SelectTrigger>
                <SelectContent>
                  {characters.map((character) => (
                    <SelectItem key={character.id} value={character.id}>
                      {character.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCharacterId && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="text-sm font-medium">姿势描述：</div>
                <div className="text-sm text-muted-foreground">
                  {selectedPreset
                    ? getPresetPoseDescription(selectedPreset)
                    : poseToDescription(pose)}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowGenerateDialog(false);
                setSelectedCharacterId("");
              }}
              disabled={isGenerating}
            >
              取消
            </Button>
            <Button onClick={handleConfirmGenerate} disabled={isGenerating || !selectedCharacterId}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  开始生成
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog - 即时预览生成的图片 */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>姿势变体生成成功</DialogTitle>
            <DialogDescription>
              {generatedImage?.poseName} - {generatedImage?.poseDescription}
            </DialogDescription>
          </DialogHeader>

          {generatedImage && (
            <div className="space-y-4">
              {/* 图片预览 */}
              <div className="aspect-[3/4] relative bg-muted rounded-lg overflow-hidden">
                <img
                  src={generatedImage.url}
                  alt={generatedImage.poseName}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* 提示信息 */}
              <div className="text-sm text-muted-foreground text-center">
                已保存到角色的"姿势变体"库中，可在角色详情页面查看管理
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPreviewDialog(false);
                    setGeneratedImage(null);
                  }}
                >
                  关闭
                </Button>
                <Button
                  onClick={() => {
                    // 打开新窗口查看大图
                    if (generatedImage?.url) {
                      window.open(generatedImage.url, "_blank");
                    }
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  查看大图
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PoseLabEditor;
