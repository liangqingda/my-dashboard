/**
 * 程序坞（应用级窗口层）的类型契约。
 *
 * 业务弹窗收起时交出一份「描述符」：稳定 id、程序坞里显示的标题、窗口种类与可序列化快照。
 * 程序坞只认这三样，不认某一页的字段；刷新页面后按快照重新渲染同一扇窗。
 * 恢复动作统一走内置的窗口渲染器（见 `windows/registry.ts`），页面组件不参与恢复，
 * 所以切到别的页面、刷新之后仍能点开程序坞里的项目。
 */

/** 程序坞停靠的屏幕边 */
export type DockPlacement = 'top' | 'right' | 'bottom' | 'left';

/** 程序坞的全局设置（用户偏好，持久化在 localStorage） */
export type DockSettings = {
  /** 停靠边 */
  placement: DockPlacement;
  /** 悬停时图标的放大倍数（1 = 不放大） */
  magnification: number;
  /** 图标边长（px） */
  itemSize: number;
  /** 自动隐藏：隐藏后由顶栏的图标按钮唤出 / 收起 */
  autoHide: boolean;
  /** 全局毛玻璃浓度（40–100，100 = 现有配方原样） */
  glassOpacity: number;
};

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
  id: string;
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
  /** 当前设置 */
  settings: DockSettings;
  /** 改一项或几项设置（立即持久化并生效） */
  updateSettings: (patch: Partial<DockSettings>) => void;
  /** 程序坞里当前收着的窗口 */
  entries: readonly DockEntry[];
  /** 程序坞是否可见（自动隐藏关闭时恒为 true） */
  revealed: boolean;
  /** 当前真正展开着的条目 id（程序坞里画运行小点用） */
  activeEntryId: string | null;
  /** 唤出 / 收起（自动隐藏关闭时收起无效） */
  showDock: () => void;
  hideDock: () => void;
  toggleDock: () => void;
  /** 把一扇窗收进程序坞；`sourceEl` 是窗口框体，用来做飞入动画 */
  minimize: (descriptor: DockDescriptor, sourceEl: HTMLElement | null) => void;
  /** 不经弹窗，直接把一条窗口快照收进程序坞（文件瓦片上的「收起到程序坞」） */
  collect: (draft: DockEntryDraft) => void;
  /**
   * `⌘M`：收起当前最上层、可收起的弹窗。返回是否真的收到了一扇——
   * 布局层据此决定要不要 `preventDefault`，没有弹窗时别抢浏览器的键。
   */
  minimizeTop: () => boolean;
  /**
   * 点程序坞里的项目：没打开就恢复这扇窗，已经打开着就收回程序坞；
   * 同一时刻只留一扇，切到另一扇时原地淡入，不再回坞绕一圈。
   */
  restore: (id: string) => void;
  /** 关闭当前恢复出来的窗口（从程序坞里移除这一条） */
  requestCloseWindow: () => void;
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
  /** 用户关掉这扇窗（Esc / 关闭按钮 / 空格等） */
  onRequestClose: () => void;
};
