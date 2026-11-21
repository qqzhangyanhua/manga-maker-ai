export type DragAnchor = { before: string } | { after: string };

/**
 * 把 dnd-kit arrayMove 的下标换成 place() 锚点。
 * 往下拖时，新下标上的那一格会排在被拖项前面，所以用 after。
 * 往上拖则用 before。下标相同或越界返回 null。
 */
export function anchorForMove(
  oldIndex: number,
  newIndex: number,
  orderedIds: readonly string[],
): DragAnchor | null {
  if (!Number.isInteger(oldIndex) || !Number.isInteger(newIndex)) return null;
  if (oldIndex === newIndex) return null;
  if (oldIndex < 0 || newIndex < 0) return null;
  if (oldIndex >= orderedIds.length || newIndex >= orderedIds.length) return null;

  const anchorId = orderedIds[newIndex];
  if (!anchorId) return null;
  if (oldIndex < newIndex) return { after: anchorId };
  return { before: anchorId };
}
