import type { CSSProperties, ReactNode } from 'react';

/** 上一个 / 下一个：某一端到头时传 null，按钮置灰 */
export type FreeModalNav = {
  /** 当前位置（从 1 开始） */
  index: number;
  /** 总数 */
  total: number;
  /** 上一个；null 表示到头 */
  onPrevious: (() => void) | null;
  /** 下一个；null 表示到头 */
  onNext: (() => void) | null;
  /** 按钮与 tip 的文案，默认「上一个」/「下一个」 */
  previousLabel?: string;
  nextLabel?: string;
  /** 快捷键提示，只进 tooltip（如 `[ / ←`） */
  shortcutHint?: string;
  /** 整组禁用（如正在编辑、还没加载完）：按钮保留、不可点 */
  disabled?: boolean;
};

/** 全屏开关由调用方持有（状态要参与正文排版），这里只给按钮 */
export type FreeModalFullscreen = {
  /** 当前是否铺满视口 */
  active: boolean;
  /** 切换全屏 */
  onToggle: () => void;
};

/** 基础弹窗外壳的入参 */
export type FreeModalProps = {
  /** 是否打开 */
  opened: boolean;
  /** 关闭（Esc、点遮罩、点关闭按钮都走它） */
  onClose: () => void;
  /** header 标题：通常是文件名 / 条目名 */
  title: ReactNode;
  /** 正文 */
  children: ReactNode;
  /** 翻页与计数；不传则 header 只有标题 */
  nav?: FreeModalNav;
  /** header 右侧第一组操作（阅读类：复制、筛选、刷新…） */
  headerActions?: ReactNode;
  /** 排在全屏按钮之后的操作（如删除），保持「删除在最右」的顺序 */
  headerTail?: ReactNode;
  /** 第二组操作：与第一组之间画一条竖线（如编辑流程） */
  headerSecondary?: ReactNode;
  /** 全屏开关；不传则不显示全屏按钮 */
  fullscreen?: FreeModalFullscreen;
  /** 是否显示关闭按钮，默认显示 */
  closeButton?: boolean;
  /** Esc 是否关闭，默认是；上层浮层打开时由调用方关掉 */
  closeOnEscape?: boolean;
  /** 空格是否关闭，默认跟随 `closeOnEscape`（编辑态、上层浮层开着时一起收掉） */
  closeOnSpace?: boolean;
  /** 整组收掉翻页 / 全屏快捷键（加载中、上层浮层开着时传 false） */
  shortcutsEnabled?: boolean;
  /** 是否把焦点锁在弹窗里，默认是 */
  trapFocus?: boolean;
  /** 是否垂直居中，默认是 */
  centered?: boolean;
  /** 宽度档位，默认 `min(980px, 92vw)` */
  size?: number | string;
  /** 关闭按钮的 aria-label，默认「关闭」 */
  closeLabel?: string;
  /** 追加到框体上的类名（只加增量，不复制框体样式） */
  contentClassName?: string;
  /** 追加到正文容器上的类名 */
  bodyClassName?: string;
  /**
   * 追加到框体上的内联尺寸：只给「同一套外观、但尺寸档不同」的场景用
   * （如子区域预览比主预览矮一档、全屏时四周留缝），框体边框 / 圆角 / 底色仍归本组件。
   */
  contentStyle?: CSSProperties;
};
