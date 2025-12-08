import { prisma, ensureDb } from "./db";

type GenerationStatus = "success" | "failed";

export async function recordGenerationLog(params: {
  userId: string;
  action: string;
  providerType?: string;
  status: GenerationStatus;
  projectId?: string | null;
  durationMs?: number;
  requestPayload?: any;
  responsePayload?: any;
  errorMessage?: string;
}) {
  const {
    userId,
    action,
    providerType,
    status,
    projectId,
    durationMs,
    requestPayload,
    responsePayload,
    errorMessage,
  } = params;

  try {
    await ensureDb();
    await prisma.generationLog.create({
      data: {
        user_id: userId,
        project_id: projectId ?? null,
        action,
        provider_type: providerType ?? null,
        status,
        duration_ms: durationMs ?? null,
        request_payload: requestPayload ? sanitizeJson(requestPayload) : null,
        response_payload: responsePayload ? sanitizeJson(responsePayload) : null,
        error_message: errorMessage ?? null,
      },
    });
  } catch (error) {
    console.error("记录生成日志失败:", error);
  }
}

const sanitizeJson = (value: any) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
};
