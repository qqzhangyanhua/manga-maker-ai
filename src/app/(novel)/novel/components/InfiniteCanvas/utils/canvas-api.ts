import { PROJECT_REQUIRED_CODE, PROJECT_REQUIRED_MESSAGE } from "@/lib/canvas/constants";

interface CanvasErrorBody {
  error?: string;
  code?: string;
  detail?: string;
}

/** 时间线还没归属漫画项目时，画布接口返回 409 + PROJECT_REQUIRED */
export class CanvasProjectRequiredError extends Error {
  constructor(message: string = PROJECT_REQUIRED_MESSAGE) {
    super(message);
    this.name = "CanvasProjectRequiredError";
  }
}

/** 把生成结果里被跳过的格子说给人看。跨片段时带上片段序号。 */
export function skippedPanelMessage(
  skipped: Array<{ segment_id?: string; shot_order: number; reason: string }> | undefined
): string | undefined {
  if (!skipped || skipped.length === 0) return undefined;
  const segments = Array.from(new Set(skipped.flatMap((item) => (item.segment_id ? [item.segment_id] : []))));
  return skipped.map((item) => {
    const segmentNo = item.segment_id ? segments.indexOf(item.segment_id) + 1 : 0;
    const where = segments.length > 1 && segmentNo > 0
      ? `第 ${segmentNo} 段第 ${item.shot_order} 格`
      : `第 ${item.shot_order} 格`;
    return `${where}：${item.reason}`;
  }).join("；");
}

/** 读取画布接口的错误信息；未归属项目时抛 CanvasProjectRequiredError。登录失效统一提示重新登录。 */
export async function readCanvasError(response: Response, fallback: string): Promise<string> {
  if (response.status === 401) {
    return "请重新登录";
  }
  let body: CanvasErrorBody = {};
  try {
    body = (await response.json()) as CanvasErrorBody;
  } catch {
    // 非 JSON 响应用兜底文案
  }
  if (response.status === 409 && body.code === PROJECT_REQUIRED_CODE) {
    throw new CanvasProjectRequiredError(body.error);
  }
  return body.detail ? `${body.error ?? fallback}：${body.detail}` : body.error ?? fallback;
}
