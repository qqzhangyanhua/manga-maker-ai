import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-helpers";
import { ensureProjectCharacters, resolvePanelChapter } from "@/lib/project";
import { panels } from "@/lib/project/chapter-panels";
import type { NewPanelInput, PanelInsertWhere } from "@/lib/project/chapter-panels";

/**
 * POST /api/panel
 * Create a new panel (shot)
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
        const {
            project_id,
            chapter_id,
            description,
            panel_type = "medium",
            importance = "medium",
            camera_angle,
            shot_size,
            dialogue,
            character_name, // DEPRECATED: Use character_id instead
            character_id, // PREFERRED
            emotion,
            panel_order, // optional, if not provided will append
        } = body;

        if (!project_id) {
            return NextResponse.json({ error: "缺少项目ID" }, { status: 400 });
        }

        // Verify project ownership
        const project = await prisma.project.findUnique({
            where: { id: project_id },
        });

        if (!project) {
            return NextResponse.json({ error: "项目不存在" }, { status: 404 });
        }

        if (project.user_id !== payload.userId) {
            return NextResponse.json({ error: "无权操作" }, { status: 403 });
        }

        // Handle character_id (backward compatibility for character_name)
        let resolvedCharacterId = character_id;
        if (!resolvedCharacterId && character_name) {
            // Backward compatibility: lookup character by exact name match (case-insensitive)
            const character = await prisma.character.findFirst({
                where: {
                    user_id: payload.userId,
                    name: { equals: character_name, mode: "insensitive" },
                },
                orderBy: { created_at: 'asc' }, // Deterministic ordering if duplicates exist
            });

            if (character) {
                console.log(`[COMPAT] Resolved character_name "${character_name}" → ${character.id} (user: ${payload.userId})`);
                resolvedCharacterId = character.id;
            } else {
                console.warn(`[COMPAT] Failed to resolve character_name: "${character_name}" (user: ${payload.userId})`);
                resolvedCharacterId = null;
            }
        }

        const chapterId = await resolvePanelChapter(prisma, project_id, chapter_id);

        const panel = await prisma.$transaction(async (tx) => {
            let projectCharacterId: string | null = null;
            if (typeof resolvedCharacterId === "string" && resolvedCharacterId.length > 0) {
                await ensureProjectCharacters(tx, {
                    projectId: project_id,
                    userId: payload.userId,
                    characterIds: [resolvedCharacterId],
                });
                const projectCharacter = await tx.projectCharacter.findUnique({
                    where: {
                        project_id_character_id: {
                            project_id,
                            character_id: resolvedCharacterId,
                        },
                    },
                    select: { id: true },
                });
                projectCharacterId = projectCharacter?.id ?? null;
            }

            const input: NewPanelInput = {
                panelType: panel_type,
                importance,
                description: description || "",
                dialogue,
                cameraAngle: camera_angle,
                shotSize: shot_size,
                emotion,
            };
            const writer = panels(project_id, { tx });
            const added = await writer.add(input, whereForNewPanel(chapterId, panel_order));
            const created = added[0];
            if (!created) {
                throw new Error("创建分镜失败");
            }
            if (projectCharacterId) {
                await writer.setLead([created.id], projectCharacterId);
            }

            return tx.panel.findUnique({
                where: { id: created.id },
                include: {
                    character: {
                        select: { id: true, name: true },
                    },
                },
            });
        });

        if (!panel) {
            return NextResponse.json({ error: "创建分镜失败" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            panel,
            message: "分镜创建成功",
        });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
        }
        console.error("Create panel error:", error);
        return NextResponse.json(
            { error: "创建分镜失败" },
            { status: 500 }
        );
    }
}

// 省略表示追加到章尾。0 与调用方约定为章首。其他数字按 1 起始，换成模块的 0 起始下标。
function whereForNewPanel(chapterId: string, panelOrder: unknown): PanelInsertWhere {
    if (panelOrder === 0) {
        return { chapter: chapterId, index: 0 };
    }
    if (typeof panelOrder === "number") {
        return { chapter: chapterId, index: panelOrder - 1 };
    }
    return { chapter: chapterId };
}
