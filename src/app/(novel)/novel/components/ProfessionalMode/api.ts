/**
 * API 层封装
 * 统一错误处理和会话过期检测
 */

import { WorkflowSession, Genre, Template } from "./types";

export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired");
    this.name = "SessionExpiredError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 404) {
    throw new SessionExpiredError();
  }
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "请求失败");
  }
  return response.json();
}

export async function fetchGenres(): Promise<Genre[]> {
  const response = await fetch("/api/novel/templates/genres");
  if (!response.ok) {
    throw new Error("获取专题列表失败");
  }
  const data = await response.json();
  return data.genres || [];
}

export async function checkPendingSession(): Promise<WorkflowSession | null> {
  try {
    const response = await fetch("/api/novel/workflow/pending");
    if (response.ok) {
      const data = await response.json();
      if (data.session_id) {
        return data as WorkflowSession;
      }
    }
  } catch {
    // 静默失败，不影响正常流程
  }
  return null;
}

export async function startWorkflow(
  genre: string | null
): Promise<WorkflowSession> {
  const response = await fetch("/api/novel/workflow/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ genre: genre === "general" ? null : genre }),
  });
  return handleResponse<WorkflowSession>(response);
}

export async function executePhase(
  sessionId: string,
  templateId: string,
  inputData: Record<string, string>,
  signal?: AbortSignal
): Promise<{
  result: string;
  parsed_result: Record<string, unknown> | null;
}> {
  const response = await fetch(`/api/novel/workflow/${sessionId}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      template_id: templateId,
      input_data: inputData,
    }),
    signal,
  });
  return handleResponse(response);
}

export async function optimizeResult(
  sessionId: string,
  currentResult: string,
  instruction: string | null
): Promise<{
  optimized_result: string;
  parsed_result: Record<string, unknown> | null;
}> {
  const response = await fetch(`/api/novel/workflow/${sessionId}/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_result: currentResult,
      optimization_instruction: instruction,
    }),
  });
  return handleResponse(response);
}

export async function nextPhase(sessionId: string): Promise<{
  is_final: boolean;
  current_phase?: string;
  completed_phases?: string[];
  available_templates?: Template[];
}> {
  const response = await fetch(`/api/novel/workflow/${sessionId}/next`, {
    method: "POST",
  });
  return handleResponse(response);
}

export async function previousPhase(sessionId: string): Promise<{
  current_phase: string;
  completed_phases: string[];
  available_templates: Template[];
  previous_input?: Record<string, string>;
  previous_output?: string;
}> {
  const response = await fetch(`/api/novel/workflow/${sessionId}/previous`, {
    method: "POST",
  });
  return handleResponse(response);
}

export async function completeWorkflow(
  sessionId: string,
  projectTitle: string,
  projectDescription: string | null
): Promise<{ project_id: string }> {
  const response = await fetch(`/api/novel/workflow/${sessionId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_title: projectTitle,
      project_description: projectDescription,
    }),
  });
  return handleResponse(response);
}
