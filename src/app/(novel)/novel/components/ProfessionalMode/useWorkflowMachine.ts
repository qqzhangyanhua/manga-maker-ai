/**
 * 工作流状态机 Hook
 * 用 useReducer 管理所有状态
 */

import { useReducer, useCallback, useRef } from "react";
import {
  WorkflowState,
  WorkflowAction,
  initialState,
  OptimizationHistory,
} from "./types";

function workflowReducer(
  state: WorkflowState,
  action: WorkflowAction
): WorkflowState {
  switch (action.type) {
    case "SET_STAGE":
      return { ...state, stage: action.payload };

    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_OPTIMIZING":
      return { ...state, optimizing: action.payload };

    case "SET_GENRES":
      return { ...state, genres: action.payload };

    case "SET_SELECTED_GENRE":
      return { ...state, selectedGenre: action.payload };

    case "SET_SELECTED_TEMPLATE":
      return { ...state, selectedTemplate: action.payload };

    case "SET_INPUT_DATA":
      return { ...state, inputData: action.payload };

    case "SET_GENERATED_RESULT":
      return { ...state, generatedResult: action.payload };

    case "SET_PARSED_RESULT":
      return { ...state, parsedResult: action.payload };

    case "SET_PROJECT_TITLE":
      return { ...state, projectTitle: action.payload };

    case "SET_PROJECT_DESCRIPTION":
      return { ...state, projectDescription: action.payload };

    case "SET_OPTIMIZATION_INPUT":
      return { ...state, optimizationInput: action.payload };

    case "SET_SHOW_HISTORY_PANEL":
      return { ...state, showHistoryPanel: action.payload };

    case "SET_SHOW_CLOSE_CONFIRM":
      return { ...state, showCloseConfirm: action.payload };

    case "SET_SHOW_RESUME_PROMPT":
      return { ...state, showResumePrompt: action.payload };

    case "SET_PENDING_SESSION":
      return { ...state, pendingSession: action.payload };

    case "SET_SESSION":
      return { ...state, session: action.payload };

    case "START_WORKFLOW_SUCCESS":
      return {
        ...state,
        session: action.payload,
        stage: "workflow",
        loading: false,
      };

    case "EXECUTE_PHASE_SUCCESS": {
      const initialHistory: OptimizationHistory[] = [
        {
          version: 1,
          content: action.payload.result,
          timestamp: new Date(),
        },
      ];
      return {
        ...state,
        generatedResult: action.payload.result,
        parsedResult: action.payload.parsedResult,
        optimizationHistory: initialHistory,
        stage: "result",
        loading: false,
      };
    }

    case "NEXT_PHASE_SUCCESS":
      if (action.payload.isFinal) {
        return { ...state, stage: "completing", loading: false };
      }
      return {
        ...state,
        session: state.session
          ? {
              ...state.session,
              current_phase: action.payload.currentPhase || state.session.current_phase,
              completed_phases: action.payload.completedPhases || state.session.completed_phases,
              available_templates: action.payload.availableTemplates || state.session.available_templates,
            }
          : null,
        selectedTemplate: null,
        inputData: {},
        generatedResult: "",
        parsedResult: null,
        optimizationHistory: [],
        stage: "workflow",
        loading: false,
      };

    case "PREVIOUS_PHASE_SUCCESS":
      return {
        ...state,
        session: state.session
          ? {
              ...state.session,
              current_phase: action.payload.currentPhase,
              completed_phases: action.payload.completedPhases,
              available_templates: action.payload.availableTemplates,
            }
          : null,
        selectedTemplate: null,
        inputData: action.payload.previousInput || {},
        generatedResult: action.payload.previousOutput || "",
        parsedResult: null,
        optimizationHistory: [],
        stage: "workflow",
        loading: false,
      };

    case "OPTIMIZE_SUCCESS": {
      const newHistory: OptimizationHistory = {
        version: state.optimizationHistory.length + 1,
        content: action.payload.result,
        instruction: action.payload.instruction,
        timestamp: new Date(),
      };
      return {
        ...state,
        generatedResult: action.payload.result,
        parsedResult: action.payload.parsedResult,
        optimizationHistory: [...state.optimizationHistory, newHistory],
        optimizationInput: "",
        optimizing: false,
      };
    }

    case "REVERT_TO_VERSION": {
      const historyItem = state.optimizationHistory.find(
        (h) => h.version === action.payload
      );
      if (!historyItem) return state;
      return {
        ...state,
        generatedResult: historyItem.content,
        parsedResult: null,
        showHistoryPanel: false,
      };
    }

    case "SESSION_EXPIRED":
      return { ...state, stage: "session_expired", loading: false };

    case "RESUME_SESSION":
      return {
        ...state,
        session: state.pendingSession,
        stage: "workflow",
        showResumePrompt: false,
        pendingSession: null,
      };

    case "START_NEW_SESSION":
      return {
        ...state,
        showResumePrompt: false,
        pendingSession: null,
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

export function useWorkflowMachine() {
  const [state, dispatch] = useReducer(workflowReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: "SET_LOADING", payload: loading });
  }, []);

  const setOptimizing = useCallback((optimizing: boolean) => {
    dispatch({ type: "SET_OPTIMIZING", payload: optimizing });
  }, []);

  const setStage = useCallback((stage: WorkflowState["stage"]) => {
    dispatch({ type: "SET_STAGE", payload: stage });
  }, []);

  const createAbortController = useCallback(() => {
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current;
  }, []);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const clearAbortController = useCallback(() => {
    abortControllerRef.current = null;
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    cancelGeneration();
  }, [cancelGeneration]);

  return {
    state,
    dispatch,
    setLoading,
    setOptimizing,
    setStage,
    createAbortController,
    cancelGeneration,
    clearAbortController,
    reset,
  };
}
