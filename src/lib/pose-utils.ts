import { PoseData } from "@/components/PoseLab/Mannequin";

/**
 * 将 PoseData 转换为文本描述
 * 简单分析关节点位置，生成适合 AI 图像生成的文本提示
 */
export function poseToDescription(pose: PoseData): string {
  const descriptions: string[] = [];

  // 分析手臂姿势
  const leftArmY = pose.leftWrist[1] - pose.leftShoulder[1];
  const rightArmY = pose.rightWrist[1] - pose.rightShoulder[1];

  if (leftArmY > 0.3 && rightArmY > 0.3) {
    descriptions.push("双手举起");
  } else if (leftArmY > 0.3) {
    descriptions.push("左手举起");
  } else if (rightArmY > 0.3) {
    descriptions.push("右手举起");
  }

  // 分析手臂前后位置 (Z轴)
  if (Math.abs(pose.leftWrist[2]) > 0.3 || Math.abs(pose.rightWrist[2]) > 0.3) {
    descriptions.push("手臂前伸");
  }

  // 分析腿部姿势
  const leftLegZ = Math.abs(pose.leftAnkle[2] - pose.leftHip[2]);
  const rightLegZ = Math.abs(pose.rightAnkle[2] - pose.rightHip[2]);
  const leftKneeHeight = pose.leftKnee[1];
  const rightKneeHeight = pose.rightKnee[1];

  if (leftLegZ > 0.3 || rightLegZ > 0.3) {
    descriptions.push("动态姿势");
  }

  if (Math.abs(leftKneeHeight - rightKneeHeight) > 0.2) {
    descriptions.push("不对称站姿");
  }

  // 分析头部姿势
  const headTilt = pose.head[2];
  if (Math.abs(headTilt) > 0.1) {
    descriptions.push(headTilt > 0 ? "头部向前倾" : "头部向后仰");
  }

  // 分析身体倾斜
  const bodyTiltX = pose.chest[0] - pose.hips[0];
  if (Math.abs(bodyTiltX) > 0.1) {
    descriptions.push(bodyTiltX > 0 ? "身体向右倾斜" : "身体向左倾斜");
  }

  // 如果没有明显特征，返回默认描述
  if (descriptions.length === 0) {
    return "自然站立姿势";
  }

  return descriptions.join("，");
}

/**
 * 根据预设姿势名称返回更精确的描述
 */
export function getPresetPoseDescription(presetName: string): string {
  const presetDescriptions: Record<string, string> = {
    "站立": "自然站立姿势，双手放在身体两侧",
    "战斗姿态": "战斗准备姿态，双手抬起呈防御或攻击姿势，身体微微前倾，充满力量感",
    "奔跑": "奔跑动作，双臂前后摆动，一腿在前一腿在后，充满动感",
    "思考": "思考姿势，一只手托着下巴或放在头部附近，身体略微前倾",
    "坐姿": "坐在椅子上的姿势，膝盖弯曲，双手自然放在腿上",
    "跳跃": "跳跃动作，整个身体腾空，双臂上扬，双腿微微弯曲",
    "防御": "防御姿态，双臂交叉在胸前，身体略微后仰，准备抵挡攻击",
    "攻击": "攻击动作，一只手臂向前挥出，身体前倾，充满进攻性",
    "行走": "自然行走姿势，一腿在前一腿在后，手臂自然摆动",
    "跪下": "单膝跪地姿势，一腿跪地，另一腿支撑身体",
    "指向": "指向动作，一只手臂伸直指向前方，表示方向或重点",
    "挥手": "挥手打招呼，一只手臂抬起摆动，表示问候或告别",
    "胜利": "胜利姿态，双臂高举过头顶，庆祝胜利或成功",
    "交叉手臂": "双臂交叉抱在胸前，表示自信或沉思",
    "俯身": "身体前倾俯身，双手自然下垂或准备触碰地面",
    "躺下": "躺在地上的姿势，身体平躺，四肢放松",
    "飞行": "超级英雄式飞行姿势，身体前倾，双臂向后伸展，充满速度感",
    "倒地": "倒地姿势，身体侧倒在地上，手臂支撑或伸展",
    "投掷": "投掷动作，一只手臂高举准备投掷，身体扭转蓄力",
    "后仰": "身体后仰姿势，头部和上身向后倾斜，双臂向后伸展保持平衡",
    "蹲下": "蹲姿，膝盖深度弯曲，臀部接近脚跟，双手放在膝盖上或地面",
    "祈祷": "祈祷姿势，双手合十在胸前，头部微微低垂，表示虔诚或祈愿",
    "张开双臂": "张开双臂的姿势，双臂向两侧完全展开，表示欢迎或拥抱",
    "推": "推动作，双手向前用力推，身体前倾，双腿用力支撑",
    "拉": "拉动作，双手向身体方向用力拉，身体后倾，双腿蹬地",
    "爬行": "爬行姿势，四肢着地，身体低下，膝盖和手掌支撑身体重量",
    "侧身": "侧身站立姿势，身体略微转向一侧，呈现侧面轮廓",
    "下腰": "下腰动作，上身向后弯曲，双手触地或向后伸展，展现柔韧性",
    "冲刺": "全力冲刺动作，身体极度前倾，手臂大幅度摆动，腿部发力奔跑",
  };

  return presetDescriptions[presetName] || "自然站立姿势";
}

/**
 * 将姿势描述整合到角色生成提示词中
 */
export function buildPosePrompt(
  characterDescription: string,
  poseDescription: string
): string {
  return `${characterDescription}, ${poseDescription}, full body shot, dynamic pose, detailed`;
}
