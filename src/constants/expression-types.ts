/**
 * 表情类型常量
 *
 * 此文件只包含纯数据，可以安全地在客户端和服务端使用
 */

// 9 种表情类型
export const EXPRESSION_TYPES = [
  "neutral",
  "happy",
  "sad",
  "angry",
  "surprised",
  "shy",
  "confident",
  "worried",
  "determined",
] as const;

export type ExpressionType = (typeof EXPRESSION_TYPES)[number];

// 表情中英文映射
export const EXPRESSION_LABELS: Record<ExpressionType, string> = {
  neutral: "平静",
  happy: "开心",
  sad: "悲伤",
  angry: "愤怒",
  surprised: "惊讶",
  shy: "害羞",
  confident: "自信",
  worried: "担忧",
  determined: "坚定",
};

// 表情提示词模板 - 优化为更精确的描述
export const EXPRESSION_PROMPTS: Record<ExpressionType, string> = {
  neutral: "neutral calm expression, peaceful face, natural relaxed look, soft eyes, gentle demeanor, serene",
  happy: "happy joyful expression, bright genuine smile, sparkling cheerful eyes, radiant face, delighted, beaming with joy",
  sad: "sad melancholic expression, downcast teary eyes, sorrowful face, dejected look, tears welling up, emotional sadness",
  angry: "angry fierce expression, furrowed angry brows, intense glaring eyes, clenched jaw, scowling face, showing anger",
  surprised: "surprised shocked expression, wide open eyes, raised eyebrows, open mouth, amazed look, astonished face",
  shy: "shy embarrassed expression, blushing cheeks, looking away bashfully, timid demeanor, flustered, coy smile",
  confident: "confident self-assured expression, determined sharp eyes, slight smirk, bold gaze, strong presence, assertive look",
  worried: "worried anxious expression, concerned furrowed brows, nervous eyes, troubled look, uneasy demeanor, apprehensive",
  determined: "determined resolute expression, focused intense eyes, serious stern face, unwavering gaze, strong-willed, firm expression",
};
