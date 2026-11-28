/**
 * 弹窗根节点的动画标记与开合装配：`FreeModal` 只调这一处，不再自己算 id、拼属性。
 *
 * 两个属性分开挂：
 * - `data-dock-surface` 只给程序坞的开合动画找框体，且只在开着时挂——关掉的弹窗组件库会留下
 *   空壳根节点，空壳带标记会让下一次开窗先量到空壳、整段动画被跳过；
 * - `data-motion-surface` 一直挂着，它自己在查找时挑「还挂着内容框」的那个根节点，且不跟
 *   「当前内容那条」的 id 走（翻篇重播开窗动画就出在这）。
 */

import { useId } from 'react';

import type { DockDescriptor } from '@/dock/types';

import { useModalMotion } from './useModalMotion';

type UseModalSurfaceMotionParams = {
  /** 程序坞描述：给了就用它算窗的身份（同一扇窗的动画按同一个 id 找框体） */
  dock?: DockDescriptor;
  /** 当前是否全屏：全屏时不做几何位移 */
  fullscreenActive: boolean;
  /** 动画播完之后的真正关闭 */
  onClose: () => void;
  /** 是否打开 */
  opened: boolean;
  /** 没有程序坞描述时，业务直接交代窗的身份（正文加载中也能开合） */
  surfaceId?: string;
};

type UseModalSurfaceMotionResult = {
  /** 是否正在播关闭动画 */
  isClosing: () => boolean;
  /** 关闭入口：先动画、再按 `after`（不传就是 `onClose`）收场 */
  requestClose: (after?: () => void) => void;
  /** 摊到 `Modal` 上的根节点 data 属性 */
  surfaceProps: Record<string, string>;
};

export const useModalSurfaceMotion = ({
  dock,
  fullscreenActive,
  onClose,
  opened,
  surfaceId,
}: UseModalSurfaceMotionParams): UseModalSurfaceMotionResult => {
  const fallbackId = useId();
  /*
   * 开合动画的 id 只认「窗自己」：业务给的 `surfaceId` → 程序坞窗口自己的条目 → 实例 id。
   * 不跟 `dock.id`（当前内容那条）走：翻篇一换内容，id 就换，开窗动画会被重播一遍。
   */
  const motionSurfaceId = surfaceId ?? dock?.surfaceId ?? fallbackId;

  /*
   * 是不是程序坞里的窗：`dock` 只在正文就位后才给（加载期不让收坞、不让删），
   * 但动画身份不能跟着丢——加载期一丢就被当成页面弹窗，照着点击点自己播一趟开窗动画，
   * 正文到位后切成坞窗再把它取消、由宿主重播一遍，观感就是闪一下、重新长一次。
   * `surfaceId` 是业务在加载期就能交代的同一份身份，用它兜住。
   */
  const isDockWindow = dock?.origin === 'dock' || surfaceId !== undefined;

  const { isClosing, requestClose } = useModalMotion({
    enabled: !isDockWindow,
    geometryEnabled: !fullscreenActive,
    onClose,
    opened,
    surfaceId: motionSurfaceId,
  });

  /*
   * 宿主按这个属性找框体。加载期也要挂：挂晚了宿主第一帧找不到框体，
   * 骨架框体会先以终态露一下，属性补上后再从头跑几何动画。
   */
  const dockSurfaceId = dock?.surfaceId ?? dock?.id ?? surfaceId;

  const surfaceProps: Record<string, string> = {
    'data-motion-surface': motionSurfaceId,
  };

  if (dockSurfaceId !== undefined && opened) {
    surfaceProps['data-dock-surface'] = dockSurfaceId;
  }

  return { isClosing, requestClose, surfaceProps };
};
