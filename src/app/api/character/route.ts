import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadImageToMinio, validateImageFile } from "@/lib/upload-helpers";

// GET /api/character - Get all characters for current user
export async function GET(req: Request) {
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

    // Parse query parameters for filtering
    const { searchParams } = new URL(req.url);
    const styleId = searchParams.get("style_id");

    // Build where clause
    const whereClause: {
      user_id: string;
      comic_style_id?: string | null;
    } = {
      user_id: payload.userId,
    };

    // Filter by style if provided
    if (styleId === "null") {
      // Show characters without style
      whereClause.comic_style_id = null;
    } else if (styleId) {
      // Show characters with specific style
      whereClause.comic_style_id = styleId;
    }
    // If no styleId parameter, show all characters

    const characters = await prisma.character.findMany({
      where: whereClause,
      include: {
        views: true,
        expressions: true,
        outfits: true,
        comic_style: {
          select: {
            id: true,
            style_key: true,
            name_zh: true,
            name_en: true,
            image_url: true,
            tag_color: true,
            prompt_prefix: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ characters });
  } catch (error) {
    console.error("Get characters error:", error);
    return NextResponse.json(
      { error: "获取角色列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/character - Create new character with optional image uploads
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

    const contentType = req.headers.get("content-type") || "";
    
    // Handle FormData (with images)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const name = formData.get("name") as string;
      const description = formData.get("description") as string | null;
      const base_prompt = formData.get("base_prompt") as string | null;
      const tags = formData.get("tags") as string | null;
      const comic_style_id = formData.get("comic_style_id") as string | null;
      const ai_generated_image_url = formData.get("ai_generated_image_url") as string | null;

      if (!name || !name.trim()) {
        return NextResponse.json({ error: "角色名称不能为空" }, { status: 400 });
      }

      // Validate comic_style_id if provided
      if (comic_style_id) {
        const styleExists = await prisma.comicStyle.findUnique({
          where: { id: comic_style_id },
        });

        if (!styleExists) {
          return NextResponse.json({ error: "指定的漫画风格不存在" }, { status: 400 });
        }
      }

      // Create character first to get ID
      const character = await prisma.character.create({
        data: {
          user_id: payload.userId,
          name: name.trim(),
          description: description?.trim() || null,
          base_prompt: base_prompt?.trim() || "",
          tags: tags ? JSON.parse(tags) : [],
          comic_style_id: comic_style_id || null,
          training_status: "pending",
        },
      });

      // Create default outfit
      await prisma.characterOutfit.create({
        data: {
          character_id: character.id,
          outfit_name: "默认装",
          outfit_type: "default",
          is_default: true,
        },
      });

      // Handle image uploads
      const images: File[] = [];
      formData.forEach((value, key) => {
        if (key.startsWith("images") && value instanceof File) {
          images.push(value);
        }
      });

      let baseImageUrl: string | null = null;
      const uploadedImages: Array<{ url: string; type: string }> = [];

      // Use AI-generated image URL if provided
      if (ai_generated_image_url) {
        baseImageUrl = ai_generated_image_url;
        uploadedImages.push({ url: ai_generated_image_url, type: "base" });
      }
      // Otherwise upload images to MinIO
      else if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const file = images[i];

          // Validate image
          const validation = validateImageFile(file);
          if (!validation.valid) {
            console.warn(`Skipping invalid image ${i + 1}:`, validation.error);
            continue;
          }

          // Upload to MinIO
          const type = i === 0 ? "base" : "reference";
          const uploadResult = await uploadImageToMinio(
            file,
            payload.userId,
            character.id,
            type
          );

          if (uploadResult.success && uploadResult.url) {
            uploadedImages.push({ url: uploadResult.url, type });

            // First image becomes base_image_url
            if (i === 0) {
              baseImageUrl = uploadResult.url;
            }
          } else {
            console.warn(`Failed to upload image ${i + 1}:`, uploadResult.error);
          }
        }
      }

      // Update character with base_image_url if we have one
      if (baseImageUrl) {
        await prisma.character.update({
          where: { id: character.id },
          data: { base_image_url: baseImageUrl },
        });
      }

      // Return complete character data
      const updatedCharacter = await prisma.character.findUnique({
        where: { id: character.id },
        include: {
          views: true,
          expressions: true,
          outfits: true,
          comic_style: {
            select: {
              id: true,
              style_key: true,
              name_zh: true,
              name_en: true,
              image_url: true,
              tag_color: true,
              prompt_prefix: true,
            },
          },
        },
      });

      return NextResponse.json({
        character: updatedCharacter,
        uploadedImages,
        message: `角色创建成功${uploadedImages.length > 0 ? `，已上传 ${uploadedImages.length} 张图片` : ""}`,
      }, { status: 201 });
    } 
    
    // Handle JSON (no images)
    else {
      const body = await req.json();
      const { name, description, base_prompt, tags, base_image_url, comic_style_id } = body;

      if (!name) {
        return NextResponse.json({ error: "角色名称不能为空" }, { status: 400 });
      }

      // Validate comic_style_id if provided
      if (comic_style_id) {
        const styleExists = await prisma.comicStyle.findUnique({
          where: { id: comic_style_id },
        });

        if (!styleExists) {
          return NextResponse.json({ error: "指定的漫画风格不存在" }, { status: 400 });
        }
      }

      const character = await prisma.character.create({
        data: {
          user_id: payload.userId,
          name,
          description: description || null,
          base_prompt: base_prompt || "",
          tags: tags || [],
          base_image_url: base_image_url || null,
          comic_style_id: comic_style_id || null,
          training_status: "pending",
        },
        include: {
          views: true,
          expressions: true,
          outfits: true,
          comic_style: {
            select: {
              id: true,
              style_key: true,
              name_zh: true,
              name_en: true,
              image_url: true,
              tag_color: true,
              prompt_prefix: true,
            },
          },
        },
      });

      // Create default outfit
      await prisma.characterOutfit.create({
        data: {
          character_id: character.id,
          outfit_name: "默认装",
          outfit_type: "default",
          is_default: true,
        },
      });

      return NextResponse.json({ character }, { status: 201 });
    }
  } catch (error) {
    console.error("Create character error:", error);
    return NextResponse.json(
      { error: "创建角色失败" },
      { status: 500 }
    );
  }
}
