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
  /**
   * 是否给切换入口（header 按钮与 `F` 键），默认 `true`。
   * 传 `false` 时只保留「当前是否铺满」这一层外观：进编辑这类不该换阅读尺寸的场景，
   * 收掉入口而不是把框体缩回常规。
   */
  showToggle?: boolean;
};

/**
 * header「复制」能力的快捷键配置：给了文本，`C` 就把这段写进剪贴板。
 * 文本与提示文案由调用方给（复制的是路径还是记录 ID 只有业务侧知道），
 * 键位、通知 id 与成功反馈时长统一由外壳处理。
 */
export type FreeModalCopy = {
  /** 要写进剪贴板的文本 */
  text: string;
  /** 复制成功的提示文案（如「相对路径已复制」） */
  message: string;
};

/**
 * 媒体类内容的快捷键能力：给了 `onTogglePlay`，空格就切换播放 / 暂停，
 * 而不是关窗（视频看完通常按空格暂停，不按空格关窗）。键位收在外壳里，业务侧只给动作。
 */
export type FreeModalMedia = {
  /** 切换播放 / 暂停；不传则空格仍按 `closeOnSpace` 处理 */
  onTogglePlay?: () => void;
  /** 切换静音；不传则 `m` / `M` 不动作 */
  onToggleMute?: () => void;
};

/** 方向键的两种去向：回到调用方当快进 / 后退，或留在外壳里翻篇 */
export type FreeModalSeekDirection = 'backward' | 'forward';

/** 基础弹窗外壳的入参 */
export type FreeModalProps = {
  /** 是否打开 */
  opened: boolean;
  /** 关闭（Esc、点遮罩、点关闭按钮都走它） */
  onClose: () => void;
  /** header 标题（文件名 / 条目名）：单行放不下才省略并弹 tip，走 `FreeTruncatedText` */
  title: string;
  /** 正文 */
  children: ReactNode;
  /**
   * header 是否浮在正文之上（绝对定位、覆盖正文顶部），默认按普通流排版。
   * 给视频这类「header 平时可以藏起来」的弹窗用：隐藏时正文能占满整块高度。
   */
  headerOverlay?: boolean;
  /**
   * header 是否处于隐藏态：淡出并上移、不接收指针事件。
   * 只影响外观，不卸载 header——按钮仍由业务侧决定是否可用（配合 `headerOverlay` 使用）。
   */
  headerHidden?: boolean;
  /** 媒体快捷键：传了 `media`，空格切播放 / 暂停而不是关窗，`m` / `M` 切静音 */
  media?: FreeModalMedia;
  /**
   * `s` / `S` 切换某块面板的显隐（视频预览的目录列）。键位归外壳，动作归调用方：
   * 面板状态由业务侧持有，外壳只把按键转成一个回调。
   */
  onToggleSidebar?: () => void;
  /**
   * `Enter` 截当前画面（视频预览的存帧）。键位归外壳，动作与落盘归调用方；
   * 不传则该键不动作。
   */
  onCapture?: () => void;
  /**
   * ← / → 的方向键去向：传了就交给调用方（视频快进 / 后退），翻篇只剩 `[` / `]`；
   * 不传则方向键照旧翻篇。两种归属同一时刻只该有一种，所以用「给不给动作」表达。
   */
  onSeek?: (direction: FreeModalSeekDirection) => void;
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
  /**
   * 复制能力：给了文本，`C` 键就把这段写进剪贴板（与 header 复制按钮同一口径）。
   * 业务弹窗只决定「复制什么」，键位与通知归外壳。
   */
  copy?: FreeModalCopy;
  /**
   * 删除请求：给了回调，`Delete` / `Backspace` 就触发它。
   * 只应打开二次确认层，不在这里直接删；确认层与真正的删除动作归调用方。
   */
  onRequestDelete?: (() => void) | null;
  /**
   * 业务自己的单键动作（键名小写 → 动作），跟着弹窗这一套监听走、只在本窗开着时生效：
   * 业务弹窗要加一个快捷键就传这里，不要自己 `addEventListener`。
   */
  extraKeys?: Readonly<Record<string, () => void>>;
  /** 是否显示关闭按钮，默认显示 */
  closeButton?: boolean;
  /** Esc 是否关闭，默认是；上层浮层打开时由调用方关掉 */
  closeOnEscape?: boolean;
  /**
   * 点遮罩是否关窗（默认关）。媒体预览关掉它：切到别的应用再切回来、
   * 或者从别处拉播放器时，落点很容易落在遮罩上，一次误点就把预览关了。
   */
  closeOnClickOutside?: boolean;
  /** 空格是否关闭，默认跟随 `closeOnEscape`（编辑态、上层浮层开着时一起收掉） */
  closeOnSpace?: boolean;
  /** 整组收掉翻页 / 全屏快捷键（加载中、上层浮层开着时传 false） */
  shortcutsEnabled?: boolean;
  /** 是否把焦点锁在弹窗里，默认是 */
  trapFocus?: boolean;
  /** 是否垂直居中，默认是 */
  centered?: boolean;
  /**
   * 高度模式：
   * - `reading`（默认）：固定 `82dvh` 的阅读窗，翻篇 / 全屏 / 目录都用得上；
   * - `auto`：高度随内容（上限 `88dvh`），正文自己滚，给确认、说明、短表单、列表这类普通弹窗。
   */
  height?: 'reading' | 'auto';
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
  /**
   * 层级：默认走组件库的弹窗档。叠在另一层弹窗之上、又必须盖住它时由调用方显式抬高
   * （典型是二次确认层压在预览弹窗上：两扇窗都用默认值时，谁先挂载谁在下）。
   */
  zIndex?: number;
};
