/**
 * 待拖拽区那一格的屏幕矩形：点列表里已经选中的条目（＝取消）时，
 * 动画要从那一格起飞，而不是从被点的那张瓦片起飞。
 * 路径带 `/` 与空格，塞不进选择器，只能逐个比 `dataset`。
 */
export const pendingChipRect = (path: string): DOMRect | null => {
  for (const node of document.querySelectorAll<HTMLElement>('[data-pending-chip]')) {
    if (node.dataset.pendingChip === path) {
      return node.getBoundingClientRect();
    }
  }

  return null;
};
