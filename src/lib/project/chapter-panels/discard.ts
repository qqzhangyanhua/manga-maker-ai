import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export interface Discarded {
  variants: number;
  pipelineStates: number;
  cast: number;
  canvasLinks: number;
}

export function emptyDiscarded(): Discarded {
  return { variants: 0, pipelineStates: 0, cast: 0, canvasLinks: 0 };
}

/** 候选图、流程状态、在场角色会随分镜级联删除。画布镜头靠触发器删掉，所以先计数。 */
export async function countDiscarded(tx: Tx, ids: readonly string[]): Promise<Discarded> {
  if (ids.length === 0) return emptyDiscarded();
  const where = { panel_id: { in: [...ids] } };
  const [variants, pipelineStates, cast, canvasLinks] = await Promise.all([
    tx.panelVariant.count({ where }),
    tx.panelPipelineState.count({ where }),
    tx.panelCharacter.count({ where }),
    tx.shotDesign.count({ where }),
  ]);
  return { variants, pipelineStates, cast, canvasLinks };
}
