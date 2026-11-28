/** 清掉指针放大写在节点上的临时变量：全屏收起时把上一帧的缩放与层级一并抹平。 */

export const resetMagnification = (box: HTMLElement | null): void => {
  box?.querySelectorAll<HTMLElement>('[data-dock-item]').forEach((item) => {
    // 强行 hover 态那一格是 React 给的固定倍率，抹掉就恢复不回来了
    if (item.dataset.hover === 'true') {
      return;
    }

    item.style.removeProperty('--dock-item-scale');
    item.style.removeProperty('z-index');
  });
};
