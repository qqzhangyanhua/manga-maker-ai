import type { ExpressionItem, OutfitPreset } from "./types";

// Expression types for the matrix
export const expressions: ExpressionItem[] = [
  { id: "neutral", label: "平静", emoji: "😐" },
  { id: "happy", label: "开心", emoji: "😊" },
  { id: "sad", label: "悲伤", emoji: "😢" },
  { id: "angry", label: "愤怒", emoji: "😠" },
  { id: "surprised", label: "惊讶", emoji: "😲" },
  { id: "shy", label: "害羞", emoji: "😳" },
  { id: "confident", label: "自信", emoji: "😎" },
  { id: "worried", label: "担忧", emoji: "😟" },
  { id: "determined", label: "坚定", emoji: "😤" },
];

// Outfit presets
export const outfitPresets: OutfitPreset[] = [
  { id: "default", label: "默认装", icon: "👤" },
  { id: "school", label: "校服", icon: "🎓" },
  { id: "battle", label: "战斗服", icon: "⚔️" },
  { id: "casual", label: "休闲装", icon: "👕" },
  { id: "formal", label: "正装", icon: "👔" },
  { id: "sleepwear", label: "睡衣", icon: "🌙" },
];
