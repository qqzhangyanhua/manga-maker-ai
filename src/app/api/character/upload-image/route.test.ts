/**
 * POST /api/character/upload-image 端点测试
 *
 * 测试统一图片上传功能（三视图、表情、装备）
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import {
  createMockCharacterWithRelations,
  createMockCookies,
  createMockAuthPayload,
  createMockOutfit,
} from "../test-helpers";

// Mock 模块
const { mockCookies } = vi.hoisted(() => {
  const mockCookiesGet = vi.fn().mockReturnValue({ value: "mock-jwt-token" });
  const mockCookies = vi.fn().mockResolvedValue({ get: mockCookiesGet });
  return { mockCookies, mockCookiesGet };
});

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "comicai_session",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    character: {
      findFirst: vi.fn(),
    },
    characterView: {
      upsert: vi.fn(),
    },
    characterExpression: {
      upsert: vi.fn(),
    },
    characterOutfit: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/minio", () => ({
  minioClient: {
    putObject: vi.fn(),
  },
  MINIO_BUCKET: "test-bucket",
  ensureBucketExists: vi.fn(),
  getPublicUrl: vi.fn((objectName: string) => `https://minio.example.com/${objectName}`),
}));

vi.mock("@/lib/upload-helpers", () => ({
  validateImageFile: vi.fn(),
}));

import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { minioClient, ensureBucketExists } from "@/lib/minio";
import { validateImageFile } from "@/lib/upload-helpers";

// 创建测试文件
function createMockFile(name: string, type: string, size: number): File {
  const content = new Array(size).fill(0).join("");
  return new File([content], name, { type });
}

describe("POST /api/character/upload-image", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认：成功认证
    const mockCookiesGet = vi.fn().mockReturnValue({ value: "mock-jwt-token" });
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());

    // 默认：文件验证通过
    (validateImageFile as ReturnType<typeof vi.fn>).mockReturnValue({ valid: true });
  });

  describe("上传三视图", () => {
    it("应该成功上传三视图图片", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });
      const testFile = createMockFile("front.png", "image/png", 1024);

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterView.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "view-123",
        character_id: characterId,
        view_type: "front",
        image_url: "https://minio.example.com/test.png",
      });

      const formData = new FormData();
      formData.append("character_id", characterId);
      formData.append("type", "view");
      formData.append("sub_type", "front");
      formData.append("file", testFile);

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.image_url).toBeDefined();
      expect(minioClient.putObject).toHaveBeenCalled();
      expect(prisma.characterView.upsert).toHaveBeenCalled();
    });

    it("应该为三视图生成正确的存储路径", async () => {
      const characterId = "char-123";
      const userId = "user-test-id-456";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        user_id: userId,
      });
      const testFile = createMockFile("side.png", "image/png", 1024);

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockAuthPayload(userId)
      );
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterView.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "view-123",
        character_id: characterId,
        view_type: "side",
        image_url: "https://minio.example.com/test.png",
      });

      const formData = new FormData();
      formData.append("character_id", characterId);
      formData.append("type", "view");
      formData.append("sub_type", "side");
      formData.append("file", testFile);

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      await POST(request);

      const putObjectCall = (minioClient.putObject as ReturnType<typeof vi.fn>).mock.calls[0];
      const objectName = putObjectCall[1];
      // 文件扩展名从 testFile.name 提取，File mock 可能返回 .blob
      expect(objectName).toMatch(/^users\/user-test-id-456\/characters\/char-123\/views\/side\.(png|blob)$/);
    });
  });

  describe("上传表情", () => {
    it("应该成功上传表情图片", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });
      const testFile = createMockFile("happy.png", "image/png", 1024);

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterExpression.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "expr-123",
        character_id: characterId,
        expression_type: "happy",
        image_url: "https://minio.example.com/test.png",
      });

      const formData = new FormData();
      formData.append("character_id", characterId);
      formData.append("type", "expression");
      formData.append("sub_type", "happy");
      formData.append("file", testFile);

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.characterExpression.upsert).toHaveBeenCalled();
    });

    it("应该为表情生成正确的存储路径", async () => {
      const characterId = "char-123";
      const userId = "user-test-id-456";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        user_id: userId,
      });
      const testFile = createMockFile("sad.png", "image/png", 1024);

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockAuthPayload(userId)
      );
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterExpression.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "expr-123",
        character_id: characterId,
        expression_type: "sad",
        image_url: "https://minio.example.com/test.png",
      });

      const formData = new FormData();
      formData.append("character_id", characterId);
      formData.append("type", "expression");
      formData.append("sub_type", "sad");
      formData.append("file", testFile);

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      await POST(request);

      const putObjectCall = (minioClient.putObject as ReturnType<typeof vi.fn>).mock.calls[0];
      const objectName = putObjectCall[1];
      // 文件扩展名从 testFile.name 提取，File mock 可能返回 .blob
      expect(objectName).toMatch(/^users\/user-test-id-456\/characters\/char-123\/expressions\/sad\.(png|blob)$/);
    });
  });

  describe("上传装备图片", () => {
    it("应该成功上传装备图片", async () => {
      const characterId = "char-123";
      const outfitId = "outfit-456";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });
      const mockOutfit = createMockOutfit({ id: outfitId, character_id: characterId });
      const testFile = createMockFile("school.png", "image/png", 1024);

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (prisma.characterOutfit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOutfit
      );
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterOutfit.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockOutfit,
        image_url: "https://minio.example.com/test.png",
      });

      const formData = new FormData();
      formData.append("character_id", characterId);
      formData.append("type", "outfit");
      formData.append("sub_type", "school");
      formData.append("outfit_id", outfitId);
      formData.append("file", testFile);

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.characterOutfit.update).toHaveBeenCalledWith({
        where: { id: outfitId },
        data: { image_url: expect.any(String) },
      });
    });

    it("应该返回404当装备不存在", async () => {
      const characterId = "char-123";
      const outfitId = "non-existent";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });
      const testFile = createMockFile("test.png", "image/png", 1024);

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (prisma.characterOutfit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const formData = new FormData();
      formData.append("character_id", characterId);
      formData.append("type", "outfit");
      formData.append("sub_type", "test");
      formData.append("outfit_id", outfitId);
      formData.append("file", testFile);

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("服装不存在");
    });

    it("应该为装备生成正确的存储路径", async () => {
      const characterId = "char-123";
      const userId = "user-test-id-456";
      const outfitId = "outfit-789";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        user_id: userId,
      });
      const mockOutfit = createMockOutfit({ id: outfitId, character_id: characterId });
      const testFile = createMockFile("formal.png", "image/png", 1024);

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockAuthPayload(userId)
      );
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (prisma.characterOutfit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOutfit
      );
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterOutfit.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockOutfit);

      const formData = new FormData();
      formData.append("character_id", characterId);
      formData.append("type", "outfit");
      formData.append("sub_type", "formal");
      formData.append("outfit_id", outfitId);
      formData.append("file", testFile);

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      await POST(request);

      const putObjectCall = (minioClient.putObject as ReturnType<typeof vi.fn>).mock.calls[0];
      const objectName = putObjectCall[1];
      // 文件扩展名从 testFile.name 提取，File mock 可能返回 .blob
      expect(objectName).toMatch(/^users\/user-test-id-456\/characters\/char-123\/outfits\/outfit-789\.(png|blob)$/);
    });
  });

  describe("参数验证", () => {
    it("应该拒绝缺少必填参数的请求", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());

      const formData = new FormData();
      formData.append("character_id", "char-123");
      // 缺少 type, sub_type, file

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("缺少必填参数");
    });

    it("应该拒绝无效的 type 值", async () => {
      const testFile = createMockFile("test.png", "image/png", 1024);

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());

      const formData = new FormData();
      formData.append("character_id", "char-123");
      formData.append("type", "invalid");
      formData.append("sub_type", "test");
      formData.append("file", testFile);

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("type 必须是");
    });

    it("应该拒绝装备类型缺少 outfit_id", async () => {
      const testFile = createMockFile("test.png", "image/png", 1024);

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());

      const formData = new FormData();
      formData.append("character_id", "char-123");
      formData.append("type", "outfit");
      formData.append("sub_type", "test");
      formData.append("file", testFile);
      // 缺少 outfit_id

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("服装类型需要提供 outfit_id");
    });

    it("应该返回404当角色不存在", async () => {
      const testFile = createMockFile("test.png", "image/png", 1024);

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("character_id", "non-existent");
      formData.append("type", "view");
      formData.append("sub_type", "front");
      formData.append("file", testFile);

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("角色不存在或无权限");
    });
  });

  describe("文件验证", () => {
    it("应该拒绝无效的文件", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });
      const testFile = createMockFile("test.exe", "application/exe", 1024);

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (validateImageFile as ReturnType<typeof vi.fn>).mockReturnValue({
        valid: false,
        error: "不支持的文件类型",
      });

      const formData = new FormData();
      formData.append("character_id", characterId);
      formData.append("type", "view");
      formData.append("sub_type", "front");
      formData.append("file", testFile);

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("不支持的文件类型");
    });

    it("应该拒绝超大文件", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });
      const testFile = createMockFile("large.png", "image/png", 10 * 1024 * 1024);

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (validateImageFile as ReturnType<typeof vi.fn>).mockReturnValue({
        valid: false,
        error: "文件大小不能超过 4MB",
      });

      const formData = new FormData();
      formData.append("character_id", characterId);
      formData.append("type", "view");
      formData.append("sub_type", "front");
      formData.append("file", testFile);

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("文件大小");
    });
  });

  describe("认证失败", () => {
    it("应该拒绝未登录的请求", async () => {
      const { mockCookiesGet } = createMockCookies(false);
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });

      const formData = new FormData();
      formData.append("character_id", "char-123");
      formData.append("type", "view");
      formData.append("sub_type", "front");
      formData.append("file", createMockFile("test.png", "image/png", 1024));

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("未登录");
    });

    it("应该拒绝无效的 token", async () => {
      const mockCookiesGet = vi.fn().mockReturnValue({ value: "invalid-token" });
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const formData = new FormData();
      formData.append("character_id", "char-123");
      formData.append("type", "view");
      formData.append("sub_type", "front");
      formData.append("file", createMockFile("test.png", "image/png", 1024));

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("无效的token");
    });
  });

  describe("错误处理", () => {
    it("应该处理数据库错误", async () => {
      const testFile = createMockFile("test.png", "image/png", 1024);

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database connection error")
      );

      const formData = new FormData();
      formData.append("character_id", "char-123");
      formData.append("type", "view");
      formData.append("sub_type", "front");
      formData.append("file", testFile);

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("图片上传失败");
    });

    it("应该处理 MinIO 上传失败", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });
      const testFile = createMockFile("test.png", "image/png", 1024);

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("MinIO connection failed")
      );

      const formData = new FormData();
      formData.append("character_id", characterId);
      formData.append("type", "view");
      formData.append("sub_type", "front");
      formData.append("file", testFile);

      const request = new Request("http://localhost/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("图片上传失败");
    });
  });
});
