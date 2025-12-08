import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/panel/generate-image - 为单个分镜生成图像
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

    const body = await req.json();
    const { panel_id, prompt, style } = body;

    if (!panel_id || !prompt) {
      return NextResponse.json(
        { error: "缺少 panel_id 或 prompt" },
        { status: 400 }
      );
    }

    // 获取panel并验证权限
    const panel = await prisma.panel.findUnique({
      where: { id: panel_id },
      include: { project: true },
    });

    if (!panel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (panel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // TODO: 这里集成真实的 Stable Diffusion API
    // 当前使用占位符图像
    const placeholderImageUrl = await generatePlaceholderImage(prompt, style);

    // 更新panel的generated_image
    const updatedPanel = await prisma.panel.update({
      where: { id: panel_id },
      data: {
        generated_image: placeholderImageUrl,
        prompt_used: prompt,
      },
    });

    return NextResponse.json({
      success: true,
      panel: updatedPanel,
      image_url: placeholderImageUrl,
    });
  } catch (error) {
    console.error("Generate image error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/panel/generate-batch - 批量生成项目的所有分镜图像
export async function PUT(req: Request) {
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

    const body = await req.json();
    const { project_id } = body;

    if (!project_id) {
      return NextResponse.json({ error: "缺少 project_id" }, { status: 400 });
    }

    // 获取项目并验证权限
    const project = await prisma.project.findUnique({
      where: { id: project_id },
      include: {
        panels: {
          orderBy: { panel_order: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 批量生成图像
    const results = [];
    for (const panel of project.panels) {
      if (!panel.prompt_used) continue;

      const imageUrl = await generatePlaceholderImage(
        panel.prompt_used,
        project.style
      );

      const updatedPanel = await prisma.panel.update({
        where: { id: panel.id },
        data: { generated_image: imageUrl },
      });

      results.push(updatedPanel);
    }

    return NextResponse.json({
      success: true,
      generated_count: results.length,
      panels: results,
    });
  } catch (error) {
    console.error("Batch generate error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 占位符图像生成函数
// TODO: 替换为真实的 Stable Diffusion API 调用
async function generatePlaceholderImage(
  prompt: string,
  style?: string | null
): Promise<string> {
  // 模拟API调用延迟
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 使用占位符图像服务（带提示词的一部分作为参数）
  const seed = Math.floor(Math.random() * 10000);
  const width = 768;
  const height = 512;

  // 返回占位符URL（实际应该是上传到云存储后的URL）
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;

  // 真实实现示例：
  // const response = await fetch('https://your-sd-api.com/generate', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     prompt: `${prompt}, ${style || 'manga style'}`,
  //     negative_prompt: 'blurry, low quality, bad anatomy',
  //     width, height,
  //     steps: 30,
  //     cfg_scale: 7,
  //   })
  // });
  // const data = await response.json();
  // return data.image_url;
}
