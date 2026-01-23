/**
 * 九宫格功能导出
 */

export { GenerateNineGridDialog } from './GenerateNineGridDialog';
export { buildNineGridPrompt, validateNineGridSelection, checkShotsConsecutive } from './prompt-builder';
export { useNineGridTaskPolling } from './useNineGridTaskPolling';
export type {
  ShotDesignBasic,
  NineGridGenerateRequest,
  NineGridGenerateResponse,
  GenerateNineGridDialogProps,
  NineGridSelectionState,
} from './types';
export type { NineGridTaskStatus } from './useNineGridTaskPolling';
