/**
 * 弹窗正文区的可用高度：标题导航浮在框体之外，只能按正文区的实际高度收口，
 * 免得目录越过 footer 或跑出弹窗。
 */

import { useEffect, useState } from 'react';

import { OUTLINE_BOTTOM_GAP, OUTLINE_TOP_GAP } from '../constants';

/**
 * 量出标题导航的最大高度。
 *
 * 弹窗正文区（`.prose`）本身就是「body − footer」：footer 是它的兄弟且不收缩，
 * 所以 clientHeight 就是导航能用的纵向空间。再扣掉导航与正文顶部的间距和底部留白。
 *
 * 用窗口 resize 而不是 ResizeObserver：正文区高度只随弹窗尺寸（也就是视口）变化，
 * 而编辑态会挂掉正文节点——每次节点 / active 变化都重新挂监听，正好顺带重量一次，
 * 不必为已卸载的节点留着 observer。
 *
 * 收节点而不是 ref：弹窗正文比 header 晚一帧挂载，只盯 ref 会在节点还为空时量完、
 * 之后再没有触发点，目录就永远拿不到封顶高度。
 *
 * @param element 正文区（滚动容器）节点；还没挂上时为 null
 * @param active 是否处于可以量的状态（弹窗打开且不在编辑态）
 * @returns 可用高度（px）；null 表示还没量到，由样式兜底
 */
export const useOutlineMaxHeight = (
  element: HTMLElement | null,
  active: boolean,
): number | null => {
  const [maxHeight, setMaxHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!active || !element) {
      return undefined;
    }

    const measure = () => {
      const available =
        element.clientHeight - OUTLINE_TOP_GAP - OUTLINE_BOTTOM_GAP;

      // 正文还在布局中（高度为 0）时不动已有的值，避免目录被压成一条细线
      if (available > 0) {
        setMaxHeight(available);
      }
    };

    measure();
    window.addEventListener('resize', measure);

    return () => window.removeEventListener('resize', measure);
  }, [active, element]);

  return maxHeight;
};
