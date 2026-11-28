/** 清掉指针放大写在节点上的临时变量：全屏收起时把上一帧的缩放与层级一并抹平。 */

export const resetMagnification = (box: HTMLElement | null): void => {
  box?.querySelectorAll<HTMLElement>('[data-dock-item]').forEach((item) => {
    item.style.removeProperty('--dock-item-scale');
    item.style.removeProperty('z-index');
  });
};
