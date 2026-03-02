import { Queue } from "bullmq";
import { QUEUE_NAMES, getRedisConnection, DEFAULT_JOB_OPTIONS } from "./config";

export interface ImageGenerationJobData {
  taskId: string;
  panelId: string;
  prompt: string;
  negativePrompt?: string;
  style?: string;
  quality?: "standard" | "high";
  userId: string;
  projectId: string;
  dedupeKey?: string;
}

export interface TextGenerationJobData {
  taskId: string;
  chapterId: string;
  storyId: string;
  userId: string;
  mode: "storyboard" | "script";
  dedupeKey?: string;
}

let _imageQueue: Queue<ImageGenerationJobData> | null = null;
let _textQueue: Queue<TextGenerationJobData> | null = null;

/** 获取图像生成队列单例 */
export function getImageQueue(): Queue<ImageGenerationJobData> {
  if (!_imageQueue) {
    _imageQueue = new Queue<ImageGenerationJobData>(QUEUE_NAMES.IMAGE_GENERATION, {
      connection: getRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }
  return _imageQueue;
}

/** 获取文本生成队列单例 */
export function getTextQueue(): Queue<TextGenerationJobData> {
  if (!_textQueue) {
    _textQueue = new Queue<TextGenerationJobData>(QUEUE_NAMES.TEXT_GENERATION, {
      connection: getRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }
  return _textQueue;
}
