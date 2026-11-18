import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { GalleryDetail } from "@/lib/gallery-types";

/**
 * GET /api/gallery/[id] - 获取画廊作品详情
 * 公开接口，无需认证
 * 自动增加浏览计数
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    // 查询作品详情
    const panel = await prisma.panel.findUnique({
      where: { id },
      select: {
        id: true,
        project_id: true,
        panel_order: true,
        panel_type: true,
        importance: true,
        description: true,
        dialogue: true,
        generated_image: true,
        prompt_used: true,
        visual_prompt: true,
        camera_angle: true,
        shot_size: true,
        view_count: true,
        shared_at: true,
        show_prompt: true,
        is_shared: true,
        expression_type: true,

        // 关联项目信息
        project: {
          select: {
            id: true,
            title: true,
            style: true,
            user_id: true,
            story_id: true,
            // projects.style 是自由文本画风描述，不是 comic_styles 的 ID，风格信息取 comic_style_id 关联
            comic_style: {
              select: {
                id: true,
                name_zh: true,
                name_en: true,
                style_key: true,
              },
            },
          },
        },

        // 关联角色信息
        character: {
          select: {
            id: true,
            name: true,
            base_image_url: true,
          },
        },

        // 关联服装信息
        outfit: {
          select: {
            id: true,
            outfit_name: true,
            outfit_type: true,
          },
        },

        // 关联场景信息
        scene: {
          select: {
            id: true,
            name: true,
            scene_type: true,
            image_url: true,
          },
        },
      },
    });

    // 检查作品是否存在且已分享
    if (!panel) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }

    if (!panel.is_shared) {
      return NextResponse.json({ error: "作品未分享" }, { status: 403 });
    }

    // 增加浏览计数（异步执行，不阻塞响应）
    prisma.panel
      .update({
        where: { id },
        data: { view_count: { increment: 1 } },
      })
      .catch((error) => {
        console.error("Failed to increment view count:", error);
      });

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: panel.project.user_id },
      select: {
        id: true,
        name: true,
        image: true,
      },
    });

    // 组装响应数据
    const detail: GalleryDetail = {
      id: panel.id,
      project_id: panel.project_id,
      panel_order: panel.panel_order,
      panel_type: panel.panel_type,
      importance: panel.importance,
      description: panel.description,
      dialogue: panel.dialogue,
      generated_image: panel.generated_image,
      prompt_used: panel.show_prompt ? panel.prompt_used : null, // 根据设置决定是否显示 prompt
      visual_prompt: panel.show_prompt ? panel.visual_prompt : null,
      camera_angle: panel.camera_angle,
      shot_size: panel.shot_size,
      view_count: panel.view_count + 1, // 返回增加后的计数
      shared_at: panel.shared_at,
      show_prompt: panel.show_prompt,
      expression_type: panel.expression_type,
      story_id: panel.project.story_id,
      project: {
        id: panel.project.id,
        title: panel.project.title,
        style: panel.project.style,
        user_id: panel.project.user_id,
      },
      author: {
        id: user?.id || panel.project.user_id,
        name: user?.name || null,
        image: user?.image || null,
      },
      comic_style: panel.project.comic_style,
      character: panel.character,
      outfit: panel.outfit,
      scene: panel.scene,
    };

    return NextResponse.json(detail);
  } catch (error) {
    console.error("Gallery detail error:", error);
    return NextResponse.json({ error: "获取作品详情失败" }, { status: 500 });
  }
}
