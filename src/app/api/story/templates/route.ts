import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PREDEFINED_TEMPLATES } from "@/lib/story-templates";

/**
 * GET /api/story/templates
 * List all story templates (system + user's custom templates)
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category");
        const publicOnly = searchParams.get("public_only") === "true";

        // Get authentication (optional for public templates)
        const cookieStore = await cookies();
        const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
        let userId: string | null = null;

        if (token) {
            const payload = verifyAuthToken(token);
            userId = payload?.userId || null;
        }

        // Build query
        const where: any = {};
        if (category) {
            where.category = category;
        }
        if (publicOnly) {
            where.is_public = true;
        } else if (userId) {
            // Show public templates + user's own templates
            where.OR = [{ is_public: true }, { user_id: userId }];
        } else {
            where.is_public = true;
        }

        const dbTemplates = await prisma.storyTemplate.findMany({
            where,
            orderBy: [{ usage_count: "desc" }, { created_at: "desc" }],
        });

        // Combine with predefined templates (if showing public)
        let templates = dbTemplates;
        if (publicOnly || !userId) {
            // Add predefined templates
            const predefinedFiltered = category
                ? PREDEFINED_TEMPLATES.filter((t) => t.category === category)
                : PREDEFINED_TEMPLATES;

            // Convert to DB format for consistency
            const predefinedAsDb = predefinedFiltered.map((t) => ({
                id: `predefined_${t.name}`,
                name: t.name,
                category: t.category,
                description: t.description,
                structure: t.structure as any,
                prompts: t.prompts as any,
                is_public: true,
                user_id: null,
                usage_count: 0,
                created_at: new Date(),
                updated_at: new Date(),
            }));

            templates = [...predefinedAsDb, ...dbTemplates] as any;
        }

        return NextResponse.json({
            success: true,
            templates,
            count: templates.length,
        });
    } catch (error) {
        console.error("Get templates error:", error);
        const message = error instanceof Error ? error.message : "未知错误";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/story/templates
 * Create a custom story template
 */
export async function POST(req: Request) {
    try {
        // Verify authentication
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
        const { name, category, description, structure, prompts, isPublic = false } = body;

        if (!name || !category || !structure) {
            return NextResponse.json(
                { error: "缺少必填字段: name, category, structure" },
                { status: 400 }
            );
        }

        const template = await prisma.storyTemplate.create({
            data: {
                user_id: payload.userId,
                name,
                category,
                description: description || null,
                structure,
                prompts: prompts || {},
                is_public: isPublic,
            },
        });

        return NextResponse.json({
            success: true,
            template,
            message: "模板创建成功",
        });
    } catch (error) {
        console.error("Create template error:", error);
        const message = error instanceof Error ? error.message : "未知错误";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
