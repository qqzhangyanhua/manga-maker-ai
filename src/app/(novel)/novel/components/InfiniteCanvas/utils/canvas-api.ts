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

/** 读取画布接口的错误信息；未归属项目时抛 CanvasProjectRequiredError */
export async function readCanvasError(response: Response, fallback: string): Promise<string> {
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
