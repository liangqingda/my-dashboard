/**
 * 顶栏组件的 props。
 */

/** 顶栏入参 */
export type HeaderProps = {
  /** 侧栏是否展开 */
  menuOpened: boolean;
  /** 切换侧栏展开状态 */
  onToggleMenu: () => void;
};
