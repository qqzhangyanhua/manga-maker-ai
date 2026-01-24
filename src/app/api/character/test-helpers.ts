/**
 * Character 模块测试共享工具和类型定义
 */

import { vi } from "vitest";
import type { Character, CharacterView, CharacterExpression, CharacterOutfit, ComicStyle } from "@prisma/client";

// 测试用角色数据类型
export type TestCharacter = Pick<
  Character,
  "id" | "user_id" | "name" | "description" | "base_prompt" | "tags" | "base_image_url" | "comic_style_id" | "training_status"
>;

// 完整角色类型（包含关联数据）
export type TestCharacterWithRelations = TestCharacter & {
  views: CharacterView[];
  expressions: CharacterExpression[];
  outfits: CharacterOutfit[];
  comic_style: Pick<ComicStyle, "id" | "style_key" | "name_zh" | "name_en" | "image_url" | "tag_color" | "prompt_prefix"> | null;
};

// Mock 角色数据生成器
export const createMockCharacter = (overrides: Partial<TestCharacter> = {}): TestCharacter => ({
  id: "char-test-id-123",
  user_id: "user-test-id-456",
  name: "测试角色",
  description: "这是一个测试角色",
  base_prompt: "a test character",
  tags: ["测试", "角色"],
  base_image_url: "https://example.com/character.jpg",
  comic_style_id: null,
  training_status: "pending",
  ...overrides,
});

// Mock 完整角色数据（包含关联）
export const createMockCharacterWithRelations = (
  overrides: Partial<TestCharacterWithRelations> = {}
): TestCharacterWithRelations => ({
  ...createMockCharacter(),
  views: [],
  expressions: [],
  outfits: [
    {
      id: "outfit-default-123",
      character_id: "char-test-id-123",
      outfit_name: "默认装",
      outfit_type: "default",
      is_default: true,
      image_url: null,
      prompt_modifier: "",
      trigger_word: null,
      created_at: new Date(),
    },
  ],
  comic_style: null,
  ...overrides,
});

// Mock 漫画风格数据
export const createMockComicStyle = (
  overrides: Partial<Pick<ComicStyle, "id" | "style_key" | "name_zh" | "name_en" | "image_url" | "tag_color" | "prompt_prefix">> = {}
) => ({
  id: "style-test-123",
  style_key: "test_style",
  name_zh: "测试风格",
  name_en: "Test Style",
  image_url: "https://example.com/style.jpg",
  tag_color: "#FF5733",
  prompt_prefix: "test style, ",
  ...overrides,
});

// Mock 装备数据生成器
export const createMockOutfit = (
  overrides: Partial<CharacterOutfit> = {}
): CharacterOutfit => ({
  id: "outfit-test-123",
  character_id: "char-test-id-123",
  outfit_name: "测试装",
  outfit_type: "casual",
  is_default: false,
  image_url: null,
  prompt_modifier: "",
  trigger_word: null,
  created_at: new Date(),
  ...overrides,
});

// Mock cookies for authentication
export const createMockCookies = (hasToken: boolean = true) => {
  const mockCookiesGet = vi.fn().mockReturnValue(
    hasToken ? { value: "mock-jwt-token" } : undefined
  );
  const mockCookies = vi.fn().mockResolvedValue({
    get: mockCookiesGet,
  });

  return { mockCookies, mockCookiesGet };
};

// Mock auth payload
export const createMockAuthPayload = (userId: string = "user-test-id-456") => ({
  userId,
  email: "test@example.com",
  name: "测试用户",
  role: "user",
});

// Mock FormData for file uploads
export const createMockFormData = (data: Record<string, string | File>) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value);
    } else {
      formData.append(key, value);
    }
  });
  return formData;
};

// Mock File for image uploads
export const createMockImageFile = (
  filename: string = "test.jpg",
  size: number = 1024 * 100
): File => {
  const blob = new Blob(["test image content"], { type: "image/jpeg" });
  return new File([blob], filename, { type: "image/jpeg" });
};
