/**
 * Novel 模块统一类型定义
 * 
 * 此文件汇总并重新导出所有子模块的类型定义,
 * 方便统一导入和管理
 * 
 * 注意: 由于部分类型在多个模块中重复定义,这里采用单独导出的方式
 * 避免类型冲突
 */

// ===== 基础类型 (手动导出避免冲突) =====
export type {
  NovelChapter,
  ChapterOutline,
  ChapterOutlineBackend,
  Character,
  Location,
  Faction,
  Rule,
  TimelineEvent,
  WorldSetting,
  NovelProject,
  ProjectUpdatePayload,
  DensityMode,
  PanelEstimation,
} from "./[id]/types";

// ===== 角色类型 (从 character/types 重新导出,避免与主 types 冲突) =====
// Character 类型已在上面导出,这里只导出工具函数和常量
export {
  CHARACTER_ROLES,
  RELATIONSHIP_TYPES,
  ensureCharacterFields,
  createNewCharacter,
  getRoleColor,
  getRoleLabel,
} from "./[id]/components/character/types";

export type { CharacterRelationship } from "./[id]/components/character/types";

// ===== Infinite Canvas 类型 =====
export type * from "./components/InfiniteCanvas/types";
export type * from "./components/InfiniteCanvas/shared-types";
export type * from "./components/InfiniteCanvas/detail-panel-types";
export type * from "./components/InfiniteCanvas/nodes-types";
export type * from "./components/InfiniteCanvas/DetailPanel/types";

// ===== Image Gallery 类型 =====
export type * from "./components/ImageGallery/types";

// ===== 组件类型 (如果存在) =====
// export type * from "./components/types";

// ===== 关系图类型 (如果存在) =====
// export type * from "./[id]/components/relationship-graph/types";

// ===== 世界设定类型 (如果存在) =====
// export type * from "./[id]/components/world-setting/types";

/**
 * 使用说明:
 * 
 * 1. 组件内部使用:
 *    import type { Character, ChapterOutline } from "../../type";
 * 
 * 2. Props 接口建议:
 *    - 简单 Props: 保留在组件文件内
 *    - 共享 Props: 抽离到对应模块的 types.ts
 * 
 * 3. 业务数据类型:
 *    - 必须抽离到 types.ts 文件
 *    - 避免重复定义,优先使用已有类型
 * 
 * 4. Prisma 类型:
 *    - 优先使用 @prisma/client 导出的类型
 *    - 例如: import type { ShotDesign } from "@prisma/client";
 */
