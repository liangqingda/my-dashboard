/**
 * 待拖拽区 / 列表里某一项的屏幕定位，以及「只用来飞」的拷贝：
 * 点列表里已经选中的条目（＝取消）时动画从那一格起飞，收进来时落在那一格上，
 * 所以两边都得按 `dataset` 路径逐个比（路径带 `/` 与空格，塞不进选择器）。
 */
export const pendingChipRect = (path: string): DOMRect | null => {
  for (const node of document.querySelectorAll<HTMLElement>('[data-pending-chip]')) {
    if (node.dataset.pendingChip === path) {
      return node.getBoundingClientRect();
    }
  }

  return null;
};

/** 列表里的那一枚瓦片 / 表格行：路径带 `/`、空格，塞不进选择器，逐个比 */
export const pendingTileOf = (path: string): HTMLElement | null => {
  for (const node of document.querySelectorAll<HTMLElement>('[data-entry-path]')) {
    if (node.dataset.entryPath === path) {
      return node;
    }
  }

  return null;
};

/** 待拖拽区里的那一格：移入时的落点 */
export const pendingChipOf = (path: string): HTMLElement | null => {
  for (const node of document.querySelectorAll<HTMLElement>('[data-pending-chip]')) {
    if (node.dataset.pendingChip === path) {
      return node;
    }
  }

  return null;
};

/**
 * 飞行块的「真身」：网格里直接拷那张瓦片；表格行不能照抄——`position: absolute`
 * 对 `<tr>` 不生效，拷进固定定位的浮层会散架。所以把名称那一格的内容装进一个普通块，
 * 尺寸与整行一致，飞起来看上去仍是「整行被拎起来」。
 */
export const cloneFlightBody = (
  tile: HTMLElement,
  width: number,
  height: number,
  rowBodyClass: string,
): HTMLElement => {
  if (!(tile instanceof HTMLTableRowElement)) {
    return tile.cloneNode(true) as HTMLElement;
  }

  const shell = document.createElement('div');

  shell.className = rowBodyClass;

  const cell = tile.querySelector('td');

  if (cell !== null) {
    const copy = cell.cloneNode(true) as HTMLElement;

    // 行里的操作按钮跟着拷过来只会变成浮在半空的图标：飞行块只留名称那一列
    for (const node of copy.querySelectorAll('[data-tile-actions]')) {
      node.remove();
    }

    for (const node of copy.querySelectorAll('[tabindex]')) {
      node.removeAttribute('tabindex');
    }

    shell.append(...[...copy.childNodes]);
  }

  Object.assign(shell.style, {
    height: `${height}px`,
    width: `${width}px`,
  });

  return shell;
};

/**
 * 让拷贝保持「列表里那一项的原样」，只改会影响它自己跑起来的部分：
 * 去掉 `id`（重复 id 会让样式 / 查询串味），不响应指针，也不要再被当成点选目标。
 */
export const dressClone = (clone: HTMLElement, width: number, height: number) => {
  clone.removeAttribute('id');
  clone.removeAttribute('tabindex');
  // 飞行块本身也会被 `[data-entry-path]` 扫到：拷贝不能冒充「列表里的那一项」
  clone.removeAttribute('data-entry-path');

  for (const node of clone.querySelectorAll('[id]')) {
    node.removeAttribute('id');
  }

  Object.assign(clone.style, {
    position: 'absolute',
    inset: '0',
    width: `${width}px`,
    height: `${height}px`,
    margin: '0',
    pointerEvents: 'none',
  });
};
