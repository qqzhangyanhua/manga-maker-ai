/**
 * 智能查找角色参考图
 * 优先级：reference_image → base_image_url → neutral表情 → 任意表情 → 正面三视图
 */

import { prisma } from "@/lib/db";

export interface CharacterWithAssets {
  id: string;
  name: string;
  reference_image: string | null;
  base_image_url: string | null;
  expressions: Array<{
    expression_type: string;
    image_url: string;
  }>;
  views: Array<{
    view_type: string;
    image_url: string;
  }>;
}

/**
 * 智能查找角色的最佳参考图
 * @param character 角色对象，包含表情和三视图关联
 * @returns 参考图URL，如果未找到返回undefined
 */
export function findBestReferenceImage(
  character: CharacterWithAssets
): string | undefined {
  console.log('\n========== 智能查找角色参考图 ==========');
  console.log(`角色ID: ${character.id}`);
  console.log(`角色名称: ${character.name}`);
  console.log(`reference_image: ${character.reference_image || '无'}`);
  console.log(`base_image_url: ${character.base_image_url || '无'}`);
  console.log(`表情数量: ${character.expressions?.length || 0}`);
  if (character.expressions && character.expressions.length > 0) {
    console.log(`  - 表情类型: ${character.expressions.map(e => e.expression_type).join(', ')}`);
  }
  console.log(`三视图数量: ${character.views?.length || 0}`);
  if (character.views && character.views.length > 0) {
    console.log(`  - 视图类型: ${character.views.map(v => v.view_type).join(', ')}`);
  }

  let referenceImageUrl: string | undefined;

  // 第一优先级：使用 Phase 2 的专用参考图字段
  if (character.reference_image) {
    referenceImageUrl = character.reference_image;
    console.log(`✓ 使用角色专用参考图 (reference_image): ${referenceImageUrl}`);
    console.log('====================================\n');
    return referenceImageUrl;
  }

  // 第二优先级：使用角色的主图片（base_image_url）
  if (character.base_image_url) {
    referenceImageUrl = character.base_image_url;
    console.log(`✓ 使用角色主图 (base_image_url): ${referenceImageUrl}`);
    console.log('====================================\n');
    return referenceImageUrl;
  }

  // 第三优先级：使用 neutral 表情作为参考
  if (character.expressions && character.expressions.length > 0) {
    const neutralExpression = character.expressions.find(
      exp => exp.expression_type === 'neutral'
    );
    if (neutralExpression?.image_url) {
      referenceImageUrl = neutralExpression.image_url;
      console.log(`✓ 使用角色的 neutral 表情作为参考图: ${referenceImageUrl}`);
      console.log('====================================\n');
      return referenceImageUrl;
    }

    // 使用任意一张表情图
    const firstExpression = character.expressions[0];
    if (firstExpression?.image_url) {
      referenceImageUrl = firstExpression.image_url;
      console.log(`✓ 使用角色的 ${firstExpression.expression_type} 表情作为参考图: ${referenceImageUrl}`);
      console.log('====================================\n');
      return referenceImageUrl;
    }
  }

  // 第四优先级：使用正面三视图
  if (character.views && character.views.length > 0) {
    const frontView = character.views.find(v => v.view_type === 'front');
    if (frontView?.image_url) {
      referenceImageUrl = frontView.image_url;
      console.log(`✓ 使用角色的正面三视图作为参考图: ${referenceImageUrl}`);
      console.log('====================================\n');
      return referenceImageUrl;
    }

    // 如果没有正面图，使用第一张三视图
    const firstView = character.views[0];
    if (firstView?.image_url) {
      referenceImageUrl = firstView.image_url;
      console.log(`✓ 使用角色的 ${firstView.view_type} 三视图作为参考图: ${referenceImageUrl}`);
      console.log('====================================\n');
      return referenceImageUrl;
    }
  }

  // 如果还是没有找到参考图
  console.warn('✗ 未找到可用的参考图，将不使用参考图生成');
  console.warn('提示：请确保角色有 reference_image、base_image_url、表情图或三视图');
  console.log('====================================\n');

  return undefined;
}

/**
 * 从数据库获取角色及其资产（表情、三视图）
 * @param characterId 角色ID
 * @returns 角色对象，包含表情和三视图，如果不存在返回null
 */
export async function getCharacterWithAssets(
  characterId: string
): Promise<CharacterWithAssets | null> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: {
      id: true,
      name: true,
      reference_image: true,
      base_image_url: true,
      expressions: {
        select: {
          expression_type: true,
          image_url: true,
        },
      },
      views: {
        select: {
          view_type: true,
          image_url: true,
        },
      },
    },
  });

  return character;
}

/**
 * 智能获取角色参考图（便捷方法，直接通过ID查找）
 * @param characterId 角色ID
 * @returns 参考图URL，如果未找到返回undefined
 */
export async function getCharacterReferenceImage(
  characterId: string
): Promise<string | undefined> {
  const character = await getCharacterWithAssets(characterId);
  if (!character) {
    console.warn(`角色 ${characterId} 不存在`);
    return undefined;
  }

  return findBestReferenceImage(character);
}
