import type {
  AnalyzeScriptResponse,
  BatchIdentifyCharactersResponse,
  ComicPanelOutput,
  GenerateFinalsResponse,
  IdentifiedCharacter,
  IdentifyCharactersResponse,
  PlanShotsResponse,
  ScriptSegmentOutput,
  ShotDesignOutput,
} from "@/lib/novel-backend-client";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || typeof value === "number";
}

function isScriptSegment(value: unknown): value is ScriptSegmentOutput {
  if (!isRecord(value)) return false;
  return (
    typeof value.segment_order === "number" &&
    typeof value.content === "string" &&
    typeof value.scene_description === "string" &&
    typeof value.character_actions === "string" &&
    (value.dialogue === null || typeof value.dialogue === "string") &&
    typeof value.estimated_duration === "number" &&
    typeof value.emotion_tone === "string" &&
    isOptionalNumber(value.source_text_start) &&
    isOptionalNumber(value.source_text_end)
  );
}

export function isAnalyzeScriptResponse(value: unknown): value is AnalyzeScriptResponse {
  return (
    isRecord(value) &&
    typeof value.success === "boolean" &&
    Array.isArray(value.segments) &&
    value.segments.every(isScriptSegment)
  );
}

function isShot(value: unknown): value is ShotDesignOutput {
  if (!isRecord(value)) return false;
  return (
    typeof value.shot_order === "number" &&
    typeof value.camera_angle === "string" &&
    typeof value.shot_size === "string" &&
    typeof value.panel_type === "string" &&
    typeof value.shot_description === "string" &&
    typeof value.composition_hint === "string" &&
    isStringArray(value.character_ids) &&
    isStringArray(value.expression_types) &&
    typeof value.prompt === "string" &&
    typeof value.negative_prompt === "string" &&
    typeof value.location_key === "string"
  );
}

export function isPlanShotsResponse(value: unknown): value is PlanShotsResponse {
  return (
    isRecord(value) &&
    typeof value.success === "boolean" &&
    Array.isArray(value.shots) &&
    value.shots.every(isShot)
  );
}

function isComicPanel(value: unknown): value is ComicPanelOutput {
  if (!isRecord(value)) return false;
  const layout = value.dialogue_layout;
  return (
    typeof value.scene_id === "string" &&
    typeof value.shot_id === "string" &&
    typeof value.image_url === "string" &&
    typeof value.generation_prompt === "string" &&
    typeof value.has_dialogue === "boolean" &&
    typeof value.status === "string" &&
    (layout === undefined || layout === null || isRecord(layout))
  );
}

export function isGenerateFinalsResponse(value: unknown): value is GenerateFinalsResponse {
  return (
    isRecord(value) &&
    typeof value.success === "boolean" &&
    Array.isArray(value.panels) &&
    value.panels.every(isComicPanel)
  );
}

function isIdentifiedCharacter(value: unknown): value is IdentifiedCharacter {
  if (!isRecord(value)) return false;
  return (
    typeof value.character_name === "string" &&
    typeof value.confidence === "number" &&
    typeof value.reason === "string"
  );
}

function isIdentificationResult(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.identified_characters) &&
    value.identified_characters.every(isIdentifiedCharacter) &&
    isStringArray(value.unmatched_names) &&
    isStringArray(value.matched_character_ids)
  );
}

export function isIdentifyCharactersResponse(value: unknown): value is IdentifyCharactersResponse {
  return isRecord(value) && typeof value.success === "boolean" && isIdentificationResult(value);
}

export function isBatchIdentifyCharactersResponse(
  value: unknown,
): value is BatchIdentifyCharactersResponse {
  if (!isRecord(value) || typeof value.success !== "boolean" || !isRecord(value.results)) {
    return false;
  }
  if (!isRecord(value.summary)) return false;
  if (typeof value.summary.total_shots !== "number") return false;
  if (typeof value.summary.shots_with_characters !== "number") return false;
  return Object.values(value.results).every(isIdentificationResult);
}
