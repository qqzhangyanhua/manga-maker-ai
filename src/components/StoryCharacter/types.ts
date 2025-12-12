/**
 * StoryCharacter Component Types
 */

import type {
  Character,
  CharacterExpression,
  CharacterOutfit,
  StoryCharacter,
} from "@prisma/client";

export type CharacterRole = "protagonist" | "antagonist" | "supporting" | "minor";

export interface CharacterWithAssets extends Character {
  expressions: CharacterExpression[];
  outfits: CharacterOutfit[];
}

export interface StoryCharacterWithDetails extends StoryCharacter {
  character: CharacterWithAssets;
}

export const ROLE_OPTIONS: { value: CharacterRole; label: string }[] = [
  { value: "protagonist", label: "主角" },
  { value: "antagonist", label: "反派" },
  { value: "supporting", label: "配角" },
  { value: "minor", label: "龙套" },
];

export const ROLE_COLORS: Record<CharacterRole, string> = {
  protagonist: "bg-yellow-500/20 text-yellow-700 border-yellow-500/50",
  antagonist: "bg-red-500/20 text-red-700 border-red-500/50",
  supporting: "bg-blue-500/20 text-blue-700 border-blue-500/50",
  minor: "bg-gray-500/20 text-gray-700 border-gray-500/50",
};
