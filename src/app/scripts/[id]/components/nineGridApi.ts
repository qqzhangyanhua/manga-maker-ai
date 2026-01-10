/**
 * 九宫格 API 服务层
 * 封装所有与九宫格生成相关的 API 调用
 */

import type { GenerateNineGridPayload } from "./NineGridDialog.types";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 生成九宫格图片
 */
export async function generateNineGridImage(
  chapterId: string,
  payload: GenerateNineGridPayload
): Promise<ApiResponse> {
  const response = await fetch(
    `/api/chapter/${chapterId}/generate-nine-grid-image`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "生成失败");
  }

  return result;
}
