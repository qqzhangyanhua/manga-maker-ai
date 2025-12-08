import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";
import { validateImageFile } from "@/lib/upload-helpers";

/**
 * POST /api/character/upload-image
 * 
 * 统一的图片上传接口，用于三视图、表情、服装等模块
 * 
 * 参数：
 * - character_id: 角色 ID
 * - type: "view" | "expression" | "outfit"
 * - sub_type: 具体类型（如 "front", "happy", "school" 等）
 * - file: 图片文件（FormData）
 * - outfit_id: (可选) 服装 ID，type="outfit" 时需要
 * 
 * 存储路径规则：
 * - 三视图: users/{userId}/characters/{charId}/views/{subType}.png
 * - 表情: users/{userId}/characters/{charId}/expressions/{subType}.png
 * - 服装: users/{userId}/characters/{charId}/outfits/{outfitId}.png
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    // 解析 FormData
    const formData = await req.formData();
    const character_id = formData.get("character_id") as string;
    const type = formData.get("type") as "view" | "expression" | "outfit";
    const sub_type = formData.get("sub_type") as string;
    const file = formData.get("file") as File;
    const outfit_id = formData.get("outfit_id") as string | null;

    // 验证必填参数
    if (!character_id || !type || !sub_type || !file) {
      return NextResponse.json(
        { error: "缺少必填参数: character_id, type, sub_type, file" },
        { status: 400 }
      );
    }

    // 验证 type 值
    if (!["view", "expression", "outfit"].includes(type)) {
      return NextResponse.json(
        { error: "type 必须是 view, expression 或 outfit" },
        { status: 400 }
      );
    }

    // 服装类型需要 outfit_id
    if (type === "outfit" && !outfit_id) {
      return NextResponse.json(
        { error: "服装类型需要提供 outfit_id" },
        { status: 400 }
      );
    }

    // 验证角色所有权
    const character = await prisma.character.findFirst({
      where: {
        id: character_id,
        user_id: payload.userId,
      },
    });

    if (!character) {
      return NextResponse.json({ error: "角色不存在或无权限" }, { status: 404 });
    }

    // 验证文件
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 确保 MinIO bucket 存在
    await ensureBucketExists();

    // 生成存储路径
    let objectName: string;
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "png";

    if (type === "view") {
      objectName = `users/${payload.userId}/characters/${character_id}/views/${sub_type}.${fileExtension}`;
    } else if (type === "expression") {
      objectName = `users/${payload.userId}/characters/${character_id}/expressions/${sub_type}.${fileExtension}`;
    } else {
      // outfit
      objectName = `users/${payload.userId}/characters/${character_id}/outfits/${outfit_id}.${fileExtension}`;
    }

    // 转换 File 为 Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传到 MinIO
    await minioClient.putObject(
      MINIO_BUCKET,
      objectName,
      buffer,
      buffer.length,
      {
        "Content-Type": file.type,
      }
    );

    // 生成公开访问 URL
    const publicUrl = getPublicUrl(objectName);

    // 更新数据库
    if (type === "view") {
      await prisma.characterView.upsert({
        where: {
          character_id_view_type: {
            character_id,
            view_type: sub_type,
          },
        },
        update: {
          image_url: publicUrl,
        },
        create: {
          character_id,
          view_type: sub_type,
          image_url: publicUrl,
        },
      });
    } else if (type === "expression") {
      await prisma.characterExpression.upsert({
        where: {
          character_id_expression_type: {
            character_id,
            expression_type: sub_type,
          },
        },
        update: {
          image_url: publicUrl,
        },
        create: {
          character_id,
          expression_type: sub_type,
          image_url: publicUrl,
        },
      });
    } else if (type === "outfit" && outfit_id) {
      // 验证服装所有权
      const outfit = await prisma.characterOutfit.findFirst({
        where: {
          id: outfit_id,
          character_id,
        },
      });

      if (!outfit) {
        return NextResponse.json({ error: "服装不存在" }, { status: 404 });
      }

      await prisma.characterOutfit.update({
        where: { id: outfit_id },
        data: { image_url: publicUrl },
      });
    }

    console.log(`图片已上传: ${publicUrl}`);

    return NextResponse.json({
      success: true,
      image_url: publicUrl,
      message: "图片上传成功",
    });
  } catch (error) {
    console.error("Upload image error:", error);
    return NextResponse.json(
      {
        error: "图片上传失败",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
