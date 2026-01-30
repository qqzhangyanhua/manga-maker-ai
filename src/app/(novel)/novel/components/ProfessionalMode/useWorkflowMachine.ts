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
  GeneratedOption,
  PhaseResult,
  WORKFLOW_PHASES,
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
        stage: "options_generating",  // 改为自动进入方案生成
        loading: true,  // 保持 loading 状态，等待 options 生成
        phaseResults: [],  // 重置阶段结果
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

    case "GENERATE_OPTIONS_SUCCESS":
      return {
        ...state,
        stage: "options_select",
        generatedOptions: action.payload,
        loading: false,
      };

    case "SELECT_OPTION":
      return {
        ...state,
        stage: "editing",
        selectedOptionId: action.payload.id,
        editingContent: action.payload.content,
      };

    case "SET_EDITING_CONTENT":
      return {
        ...state,
        editingContent: action.payload,
      };

    case "CONFIRM_PHASE": {
      const newPhaseResults = [...state.phaseResults, action.payload];
      const isAllComplete = newPhaseResults.length >= 4;
      
      // 更新 session 的 completed_phases
      const updatedSession = state.session
        ? {
            ...state.session,
            completed_phases: newPhaseResults.map((r) => r.phase),
            current_phase: isAllComplete
              ? state.session.current_phase
              : WORKFLOW_PHASES[newPhaseResults.length]?.phase || state.session.current_phase,
          }
        : null;
      
      return {
        ...state,
        stage: isAllComplete ? "preview" : "options_generating",
        session: updatedSession,
        phaseResults: newPhaseResults,
        generatedOptions: [],
        selectedOptionId: null,
        editingContent: "",
        loading: isAllComplete ? false : true,
      };
    }

    case "REDO_PHASE": {
      const phaseToRedo = action.payload;
      const phaseIndex = WORKFLOW_PHASES.findIndex((p) => p.phase === phaseToRedo);
      
      // 过滤掉要重做的阶段及之后的所有阶段
      const filteredResults = state.phaseResults.filter((r) => {
        const rIndex = WORKFLOW_PHASES.findIndex((p) => p.phase === r.phase);
        return rIndex < phaseIndex;
      });
      
      const updatedSession = state.session
        ? {
            ...state.session,
            completed_phases: filteredResults.map((r) => r.phase),
            current_phase: phaseToRedo,
          }
        : null;
      
      return {
        ...state,
        stage: "options_generating",
        session: updatedSession,
        phaseResults: filteredResults,
        generatedOptions: [],
        selectedOptionId: null,
        editingContent: "",
        loading: true,
      };
    }

    case "REGENERATE_OPTIONS":
      return {
        ...state,
        stage: "options_generating",
        generatedOptions: [],
        loading: true,
      };

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
