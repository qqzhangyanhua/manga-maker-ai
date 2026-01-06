/**
 * 建议角色相关的类型定义
 * 用于两步角色生成流程
 *
 * Week 3 Task 2: Migrated from JSONB to SuggestedCharacter table
 */

import type { SuggestedCharacter } from "@prisma/client";
import type { CharacterRole } from "@/components/StoryCharacter/types";

/**
 * SuggestedCharacter with related Character info (for GET endpoints)
 */
export type SuggestedCharacterWithRelations = SuggestedCharacter & {
  character?: {
    id: string;
    name: string;
    base_image_url: string | null;
  } | null;
};

/**
 * Response format for suggested character APIs
 */
export interface SuggestedCharacterResponse {
  id: string; // SuggestedCharacter UUID (replaces temp_id)
  name: string;
  description: string;
  appearance: string;
  role: CharacterRole;
  generated: boolean;
  character_id: string | null;
  image_url: string | null;
  optimized_prompt: string | null;
  generated_at: Date | null;
}

/**
 * @deprecated Legacy JSONB structure - kept for backward compatibility during migration
 * Will be removed in Week 4 after complete migration
 */
export interface SuggestedCharactersData {
  version: string; // "1.0"
  generated_at: string; // ISO 8601 timestamp
  characters: LegacySuggestedCharacter[];
  comic_style_id: string | null;
  settings: {
    count: number;
    temperature: number;
  };
}

/**
 * @deprecated Legacy suggested character format
 * Will be removed in Week 4 after complete migration
 */
export interface LegacySuggestedCharacter {
  temp_id: string; // Replaced by database UUID
  name: string;
  description: string;
  appearance: string;
  role: CharacterRole;
  generated: boolean;
  character_id: string | null;
  generated_at?: string;
  image_url?: string;
  optimized_prompt?: string;
}
