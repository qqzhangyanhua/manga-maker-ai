/**
 * 批量选择 Hook
 * 支持 Shift 范围选择和 Ctrl/⌘ 多选
 */
import { useState, useCallback, useMemo } from "react"

interface UseBatchSelectionOptions<T> {
  /**
   * 获取项目的唯一 ID
   */
  getId: (item: T) => string
  
  /**
   * 选择变化时的回调
   */
  onSelectionChange?: (selected: Set<string>) => void
  
  /**
   * 初始选中的 ID 列表
   */
  initialSelected?: string[]
}

interface UseBatchSelectionReturn {
  /**
   * 当前选中的 ID 集合
   */
  selected: Set<string>
  
  /**
   * 切换选择状态
   */
  toggle: (id: string, event?: React.MouseEvent) => void
  
  /**
   * 全选
   */
  selectAll: () => void
  
  /**
   * 取消全选
   */
  deselectAll: () => void
  
  /**
   * 检查是否选中
   */
  isSelected: (id: string) => boolean
  
  /**
   * 选中数量
   */
  selectedCount: number
  
  /**
   * 是否全选
   */
  isAllSelected: boolean
  
  /**
   * 是否部分选中
   */
  isPartiallySelected: boolean
  
  /**
   * 获取选中的项目
   */
  getSelectedItems: () => string[]
}

/**
 * 批量选择 Hook
 * 
 * @param items - 项目列表
 * @param options - 配置选项
 * 
 * @example
 * const { selected, toggle, selectAll, deselectAll, isSelected } = useBatchSelection(
 *   chapters,
 *   { getId: (ch) => ch.id }
 * )
 * 
 * // 单选
 * <Checkbox checked={isSelected(chapter.id)} onClick={() => toggle(chapter.id)} />
 * 
 * // Shift 范围选择
 * <div onClick={(e) => toggle(chapter.id, e)} />
 * 
 * // 全选
 * <Button onClick={selectAll}>全选</Button>
 */
export function useBatchSelection<T>(
  items: T[],
  options: UseBatchSelectionOptions<T>
): UseBatchSelectionReturn {
  const { getId, onSelectionChange, initialSelected = [] } = options
  
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialSelected)
  )
  const [lastSelected, setLastSelected] = useState<string | null>(null)

  const toggle = useCallback(
    (id: string, event?: React.MouseEvent) => {
      setSelected((prev) => {
        const newSelected = new Set(prev)

        if (event?.shiftKey && lastSelected) {
          // Shift 范围选择
          const lastIndex = items.findIndex(
            (item) => getId(item) === lastSelected
          )
          const currentIndex = items.findIndex((item) => getId(item) === id)

          if (lastIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(lastIndex, currentIndex)
            const end = Math.max(lastIndex, currentIndex)

            // 添加范围内的所有项
            for (let i = start; i <= end; i++) {
              newSelected.add(getId(items[i]))
            }
          }
        } else if (event?.metaKey || event?.ctrlKey) {
          // Ctrl/⌘ 多选
          if (newSelected.has(id)) {
            newSelected.delete(id)
          } else {
            newSelected.add(id)
          }
        } else {
          // 单选（清除其他选择）
          newSelected.clear()
          newSelected.add(id)
        }

        setLastSelected(id)
        onSelectionChange?.(newSelected)
        return newSelected
      })
    },
    [items, getId, lastSelected, onSelectionChange]
  )

  const selectAll = useCallback(() => {
    const newSelected = new Set(items.map(getId))
    setSelected(newSelected)
    onSelectionChange?.(newSelected)
  }, [items, getId, onSelectionChange])

  const deselectAll = useCallback(() => {
    setSelected(new Set())
    onSelectionChange?.(new Set())
  }, [onSelectionChange])

  const isSelected = useCallback(
    (id: string) => {
      return selected.has(id)
    },
    [selected]
  )

  const getSelectedItems = useCallback(() => {
    return Array.from(selected)
  }, [selected])

  const selectedCount = selected.size
  const isAllSelected = items.length > 0 && selectedCount === items.length
  const isPartiallySelected = selectedCount > 0 && selectedCount < items.length

  return {
    selected,
    toggle,
    selectAll,
    deselectAll,
    isSelected,
    selectedCount,
    isAllSelected,
    isPartiallySelected,
    getSelectedItems,
  }
}
