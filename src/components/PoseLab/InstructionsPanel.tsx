/**
 * Panel displaying usage instructions for the pose editor
 */
export function InstructionsPanel() {
  return (
    <div className="comic-card p-4">
      <h3 className="font-comic text-lg text-foreground mb-3">操作说明</h3>
      <ul className="text-sm text-muted-foreground space-y-2">
        <li className="flex items-start gap-2">
          <span className="text-primary">•</span>
          <span>点击关节点选择，出现控制器</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-primary">•</span>
          <span>拖动控制器的箭头调整关节位置</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-primary">•</span>
          <span>鼠标拖拽旋转视角</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-primary">•</span>
          <span>滚轮缩放画面</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-primary">•</span>
          <span>右键平移画面</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-primary">•</span>
          <span>使用撤销/重做调整编辑历史</span>
        </li>
      </ul>
    </div>
  );
}
