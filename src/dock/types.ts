/**
 * 程序坞（应用级窗口层）的类型契约。
 *
 * 业务弹窗收起时交出一份「描述符」：稳定 id、程序坞里显示的标题、窗口种类与可序列化快照。
 * 程序坞只认这三样，不认某一页的字段；刷新页面后按快照重新渲染同一扇窗。
 * 恢复动作统一走内置的窗口渲染器（见 `windows/registry.ts`），页面组件不参与恢复，
 * 所以切到别的页面、刷新之后仍能点开程序坞里的项目。
 */

/** Markdown 预览窗口恢复所需的最小快照：正文随条目一起存，恢复时不再依赖页面数据 */
export type MarkdownDockSnapshot = {
  markdown: string;
  title: string;
  storageScope: string;
  relativePath?: string;
};

/** 记录详情窗口的快照：只记 ID 与标题，正文由详情组件自己按 ID 取 */
export type RecordDockSnapshot = {
  recordId: string;
  title: string;
};

/** 图片预览里的一条（与文件页的条目同形，只留恢复需要的字段） */
export type ImageDockItem = {
  id: string;
  name: string;
  src: string;
};

/** 图片预览窗口快照 */
export type ImageDockSnapshot = {
  activeId: string;
  items: ImageDockItem[];
  storageScope: string;
};

/** 视频预览里的一条：多一张封面 */
export type VideoDockItem = ImageDockItem & {
  poster: string;
};

/** 视频预览窗口快照 */
export type VideoDockSnapshot = {
  activeId: string;
  /** 设置里选定的外部播放器名：页面卸载后仍能按它给按钮提示并尝试打开 */
  externalApp?: string;
  items: VideoDockItem[];
  storageScope: string;
};

/** 按窗口种类分派的载荷（kind 与快照一一对应，渲染器靠它收窄类型） */
export type DockWindowPayload =
  | { kind: 'markdown-preview'; snapshot: MarkdownDockSnapshot }
  | { kind: 'record-detail'; snapshot: RecordDockSnapshot }
  | { kind: 'image-preview'; snapshot: ImageDockSnapshot }
  | { kind: 'video-preview'; snapshot: VideoDockSnapshot };

/** 可收起的窗口种类 */
export type DockWindowKind = DockWindowPayload['kind'];

/** 持久化在程序坞里的一条：刷新后按它把窗口重新装出来 */
export type DockEntry = DockWindowPayload & {
  /** 稳定 id：同一扇窗重复收起只替换这一条 */
  id: string;
  /** 程序坞 tip 与窗口标题 */
  title: string;
  /** 收起时所在页面的路由（只用于说明来源，不参与恢复） */
  page: string;
  /** 收起时间：超出条数上限时按它淘汰最旧的 */
  createdAt: number;
};

/**
 * 弹窗收起时交给程序坞的描述。
 * `createdAt` 与 `page` 由程序坞补，业务侧不用关心。
 */
export type DockDescriptor = DockWindowPayload & {
  /**
   * 当前显示内容对应的条目 id（由内容派生）：决定程序坞里哪颗图标算「正在显示」、
   * X / Esc / 空格在未收录时退回普通关闭、header 计数报哪一格、`⌘M` 登记在谁身上。
   */
  id: string;
  /**
   * 这扇窗自己的条目 id（只有 `origin: 'dock'` 的窗才传，等于打开它的那颗图标）：
   * 窗内翻篇后不再变。开合 / 收起动画按它认框体，图标弱激活、X 移除哪一条、
   * 收起缩回哪颗图标都按它；不传就沿用 `id`（页面弹窗的图标就是自己）。
   */
  surfaceId?: string;
  title: string;
  /**
   * 这扇窗是谁：`page` 是页面里的业务弹窗（收起后要关掉页面状态）；
   * `dock` 是程序坞自己恢复出来的窗口（再收起只是回到程序坞，不关掉这条）。
   */
  origin?: 'page' | 'dock';
  /** 当前不可收起（编辑中 / 上层确认开着）：按钮保留但禁用 */
  disabled?: boolean;
};

/** 顶栏与布局要读的程序坞状态 */
export type DockContextValue = {
  /** 程序坞里当前收着的窗口 */
  entries: readonly DockEntry[];
  /** 正在飞入、还没有长出图标的条目 id：程序坞里先画虚位 */
  receivingIds: readonly string[];
  /** 窗里正在显示的那条内容的条目 id（程序坞里画实心运行点用）；内容没收录时为 null */
  activeEntryId: string | null;
  /**
   * 「窗是我开的，但窗内已经翻到别的内容」的那条条目 id：图标仍算打开、只是画空心点，
   * 提示它自己的内容在等着被装回来。点这颗图标会装回它的弹窗，而不是收起。
   */
  pendingEntryId: string | null;
  /** 当前打开的全屏弹窗数量：CSS 全屏与浏览器全屏都算 */
  fullscreenCount: number;
  /** 浏览器是否处于原生全屏：程序坞条与右下角控件整个让开 */
  nativeFullscreen: boolean;
  /**
   * 程序坞窗口上报「当前正在展示哪一条」：
   * 翻篇 / 列表切换后，激活的是哪颗图标（实心点 / 空心点）跟着它走；
   * 窗的收录口径与 header 动作不跟它变，仍按 `surfaceId` 那条。
   */
  reportWindowEntry: (id: string | null) => void;
  /** 弹窗上报自己的全屏态；`id` 必须稳定，卸载 / 退出时传 false */
  reportFullscreen: (id: string, active: boolean) => void;
  /** 把一扇窗收进程序坞；`sourceEl` 是窗口框体或整张瓦片，用来做飞入动画 */
  minimize: (descriptor: DockDescriptor, sourceEl: HTMLElement | null) => void;
  /** 不经弹窗，直接把一条快照收进程序坞；`sourceEl` 是整张瓦片，用来做飞入动画 */
  collect: (draft: DockEntryDraft, sourceEl?: HTMLElement | null) => void;
  /**
   * `⌘M`：收起当前最上层、可收起的弹窗。返回是否真的收到了一扇——
   * 布局层据此决定要不要 `preventDefault`，没有弹窗时别抢浏览器的键。
   */
  minimizeTop: () => boolean;
  /**
   * 点程序坞里的项目：正显示这一条就收回程序坞；窗是这颗图标开的内容却翻走了，
   * 就把这一条装回那扇窗；其它条目则切过去。同一时刻只留一扇，
   * 切窗整屏左右滑动，不再回坞绕一圈。
   */
  restore: (id: string) => void;
  /** 关闭当前恢复出来的窗口：按统一口径收回到程序坞，条目保留 */
  requestCloseWindow: () => void;
  /** 从程序坞移除一条；如果它正展开着，窗口按弹窗默认淡出后删除 */
  remove: (id: string) => void;
  /** 按程序坞顺序切上一个 / 下一个（`-1` / `1`）；返回是否真的切了 */
  stepWindow: (delta: -1 | 1) => boolean;
  /**
   * 弹窗把自己登记进「当前打开着的窗口栈」：`⌘M` 收起最后登记且可收起的那一扇。
   * 返回注销函数，弹窗关闭时调用。
   */
  registerModal: (registration: DockModalRegistration) => () => void;
};

/** 登记进窗口栈的一扇弹窗 */
export type DockModalRegistration = {
  /** 与程序坞条目同源的稳定 id */
  id: string;
  /** 收起这一扇（与 header 上的最小化按钮同一个动作） */
  minimize: () => void;
};

/** 由业务侧直接交给程序坞的一条：`page` / `createdAt` 由程序坞补 */
export type DockEntryDraft = DockWindowPayload & {
  id: string;
  title: string;
};

/** 恢复出来的窗口渲染器的入参 */
export type DockWindowProps = {
  /** 要恢复的那一条 */
  entry: DockEntry;
  /** 用户关掉这扇窗（X / Esc 与空格、遮罩同口径，都先收回程序坞） */
  onRequestClose: () => void;
};
