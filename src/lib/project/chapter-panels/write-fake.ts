import type { Prisma, PrismaClient } from "@prisma/client";

export const PROJECT = "33333333-3333-4333-8333-333333333333";
export const OTHER = "33333333-3333-4333-8333-333333333334";
export const CHAPTER = "22222222-2222-4222-8222-222222222222";
export const CHAPTER_B = "22222222-2222-4222-8222-222222222223";
export const PC1 = "55555555-5555-4555-8555-555555555555";
export const PC2 = "66666666-6666-4666-8666-666666666666";
export const OUTFIT = "99999999-9999-4999-8999-999999999999";
export const OTHER_OUTFIT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const OTHER_PC = "55555555-5555-4555-8555-555555555556";

export interface StoredPanel {
  id: string;
  project_id: string;
  chapter_id: string;
  panel_order: number;
  description: string;
  panel_type: string;
  importance: string;
  pipeline: boolean;
  created_at: string;
  segment_id?: string | null;
  dialogue?: string | null;
  camera_movement?: string | null;
  movement_speed?: string | null;
  movement_direction?: string | null;
  script_start?: number | null;
  script_end?: number | null;
  scene_id?: string | null;
  character_id?: string | null;
  outfit_id?: string | null;
  expression_type?: string | null;
  generated_image?: string | null;
  character_name?: string | null;
  sketch_image_url?: string | null;
  script_segment_id?: string | null;
  is_shared?: boolean;
  shared_at?: Date | null;
  view_count?: number;
  show_prompt?: boolean;
}

export interface StoredCast {
  panel_id: string;
  project_character_id: string | null;
  outfit_id: string | null;
  expression_type: string | null;
  sort_order: number;
  pending_character_key: string | null;
  pending_character_name: string | null;
}

export interface StoredLink {
  id: string;
  panel_id: string;
}

export interface Fake {
  tx: Prisma.TransactionClient;
  db: PrismaClient;
  panels: StoredPanel[];
  cast: StoredCast[];
  variants: StoredLink[];
  shots: StoredLink[];
  locks: string[];
  deletedCast: string[];
}

interface IdWhere {
  chapter_id?: string;
  project_id?: string;
  id?: { in: string[] };
}

interface PanelIdWhere {
  panel_id?: string | { in: string[] };
}

function seedPanel(id: string, panelOrder: number, description: string, createdAt: string): StoredPanel {
  return {
    id,
    project_id: PROJECT,
    chapter_id: CHAPTER,
    panel_order: panelOrder,
    description,
    panel_type: "dialogue",
    importance: "medium",
    pipeline: true,
    created_at: createdAt,
    segment_id: null,
  };
}

function panelIds(where: PanelIdWhere | undefined): string[] | null {
  const panelId = where?.panel_id;
  if (!panelId) return null;
  return typeof panelId === "string" ? [panelId] : panelId.in;
}

export function chapterOrders(fake: Fake, chapterId: string): Array<[string, number]> {
  return fake.panels
    .filter((panel) => panel.chapter_id === chapterId)
    .sort((left, right) => left.panel_order - right.panel_order || left.id.localeCompare(right.id))
    .map((panel) => [panel.id, panel.panel_order]);
}

export function createFake(): Fake {
  const chapters = new Map([
    [CHAPTER, { id: CHAPTER, project_id: PROJECT }],
    [CHAPTER_B, { id: CHAPTER_B, project_id: PROJECT }],
    ["other-chapter", { id: "other-chapter", project_id: OTHER }],
  ]);
  const characters = [
    { id: PC1, project_id: PROJECT, outfits: [OUTFIT] },
    { id: PC2, project_id: PROJECT, outfits: [] as string[] },
    { id: OTHER_PC, project_id: OTHER, outfits: [] as string[] },
  ];
  const stored: StoredPanel[] = [
    seedPanel("a", 1, "甲", "2026-01-01T00:00:00.000Z"),
    seedPanel("b", 2, "乙", "2026-01-02T00:00:00.000Z"),
    seedPanel("c", 3, "丙", "2026-01-03T00:00:00.000Z"),
  ];
  const cast: StoredCast[] = [];
  const variants: StoredLink[] = [];
  const shots: StoredLink[] = [];
  const locks: string[] = [];
  const deletedCast: string[] = [];
  let sequence = 0;

  const dropPanels = (ids: readonly string[]): number => {
    const removing = new Set(ids);
    let count = 0;
    for (let index = stored.length - 1; index >= 0; index -= 1) {
      const panel = stored[index];
      if (!panel || !removing.has(panel.id)) continue;
      stored.splice(index, 1);
      count += 1;
    }
    const keep = (row: { panel_id: string }) => !removing.has(row.panel_id);
    for (let index = cast.length - 1; index >= 0; index -= 1) {
      const row = cast[index];
      if (row && !keep(row)) cast.splice(index, 1);
    }
    for (let index = variants.length - 1; index >= 0; index -= 1) {
      const row = variants[index];
      if (row && !keep(row)) variants.splice(index, 1);
    }
    for (let index = shots.length - 1; index >= 0; index -= 1) {
      const row = shots[index];
      if (row && !keep(row)) shots.splice(index, 1);
    }
    return count;
  };

  const tx = {
    chapter: {
      findUnique: async (args: { where: { id: string } }) => chapters.get(args.where.id) ?? null,
    },
    panel: {
      findUnique: async (args: { where: { id: string } }) => stored.find((panel) => panel.id === args.where.id) ?? null,
      findMany: async (args: { where: IdWhere }) => stored
        .filter((panel) => {
          if (args.where.chapter_id !== undefined && panel.chapter_id !== args.where.chapter_id) return false;
          if (args.where.project_id !== undefined && panel.project_id !== args.where.project_id) return false;
          if (args.where.id?.in && !args.where.id.in.includes(panel.id)) return false;
          return true;
        })
        .sort((left, right) => left.panel_order - right.panel_order || left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id)),
      create: async (args: { data: StoredPanel & { pipeline_state?: { create: Record<string, never> } } }) => {
        sequence += 1;
        const created: StoredPanel = {
          ...args.data,
          id: `new-${sequence}`,
          pipeline: Boolean(args.data.pipeline_state),
          created_at: `2026-02-0${sequence}T00:00:00.000Z`,
        };
        stored.push(created);
        return { id: created.id };
      },
      update: async (args: { where: { id: string }; data: Partial<StoredPanel> }) => {
        const panel = stored.find((item) => item.id === args.where.id);
        if (!panel) throw new Error("分镜不存在");
        Object.assign(panel, args.data);
        return panel;
      },
      delete: async (args: { where: { id: string } }) => {
        if (dropPanels([args.where.id]) === 0) throw new Error("分镜不存在");
        return { id: args.where.id };
      },
      deleteMany: async (args: { where: { id: { in: string[] } } }) => ({ count: dropPanels(args.where.id.in) }),
    },
    panelCharacter: {
      findMany: async (args: { where: PanelIdWhere }) => {
        const ids = panelIds(args.where);
        return cast
          .filter((row) => (ids ? ids.includes(row.panel_id) : true))
          .slice()
          .sort((left, right) => left.sort_order - right.sort_order);
      },
      count: async (args: { where: PanelIdWhere }) => {
        const ids = panelIds(args.where);
        return cast.filter((row) => (ids ? ids.includes(row.panel_id) : true)).length;
      },
      deleteMany: async (args: { where: { panel_id: string } }) => {
        deletedCast.push(args.where.panel_id);
        const before = cast.length;
        for (let index = cast.length - 1; index >= 0; index -= 1) {
          if (cast[index]?.panel_id === args.where.panel_id) cast.splice(index, 1);
        }
        return { count: before - cast.length };
      },
      createMany: async (args: { data: StoredCast[] }) => {
        cast.push(...args.data);
        return { count: args.data.length };
      },
    },
    panelVariant: {
      count: async (args: { where: PanelIdWhere }) => {
        const ids = panelIds(args.where);
        return variants.filter((row) => (ids ? ids.includes(row.panel_id) : true)).length;
      },
    },
    panelPipelineState: {
      count: async (args: { where: PanelIdWhere }) => {
        const ids = panelIds(args.where);
        return stored.filter((panel) => panel.pipeline && (ids ? ids.includes(panel.id) : true)).length;
      },
    },
    shotDesign: {
      count: async (args: { where: PanelIdWhere }) => {
        const ids = panelIds(args.where);
        return shots.filter((row) => (ids ? ids.includes(row.panel_id) : true)).length;
      },
    },
    projectCharacter: {
      findMany: async (args: { where: { id: { in: string[] }; project_id: string } }) => characters
        .filter((character) => character.project_id === args.where.project_id && args.where.id.in.includes(character.id))
        .map((character) => ({
          id: character.id,
          character: { outfits: character.outfits.map((id) => ({ id })) },
        })),
    },
    $executeRaw: async (_query: TemplateStringsArray, chapterId: string) => {
      locks.push(chapterId);
      return 0;
    },
  };

  const client = tx as unknown as Prisma.TransactionClient;
  const db = { $transaction: async (fn: (inner: Prisma.TransactionClient) => Promise<unknown>) => fn(client) } as unknown as PrismaClient;
  return { tx: client, db, panels: stored, cast, variants, shots, locks, deletedCast };
}
