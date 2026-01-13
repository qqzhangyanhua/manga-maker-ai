/**
 * 数据丢失保护 Hook
 * 当存在未保存的更改时，阻止用户意外关闭/刷新页面
 *
 * @example
 * ```tsx
 * const hasUnsavedChanges = saveStatus === 'saving';
 * useUnsavedChangesWarning(hasUnsavedChanges);
 * ```
 */

import { useEffect } from 'react';

export function useUnsavedChangesWarning(hasUnsavedChanges: boolean): void {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 标准写法：preventDefault + 设置 returnValue
      e.preventDefault();

      // Chrome 要求必须设置 returnValue（即使是空字符串）
      // 现代浏览器会忽略自定义消息，显示浏览器默认提示
      e.returnValue = '';

      // 某些旧版浏览器会显示此消息
      return '您有未保存的更改，确定要离开吗？';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // 清理函数：组件卸载或依赖变化时移除监听
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);
}
