/**
 * 文件浏览页的类型定义。
 * 数据来自 Vite 中间件 `/api/files` 对本机目录的只读扫描（见 `docs/local-repo-data.md`），
 * 页面只消费列表摘要，不读文件内容。
 */

/** 列表里的一条子文件夹 */
export type FolderEntry = {
  /** 文件夹名（不含路径） */
  name: string;
  /** 文件夹绝对路径，点开时原样回传给中间件 */
  path: string;
  /** 最后修改时间（毫秒时间戳）：子文件夹之间按它「新的在前」 */
  updatedMs: number;
  /** 直属条目数（文件夹 + 文件，不递归子目录） */
  itemCount: number;
  /** 文件夹内出现过的文件分类（含深层，按中间件的扫描预算收口） */
  categories: FileCategory[];
  /** 直属子项里有没有应用包：只勾「App」时据此露出真正的应用目录 */
  hasApps: boolean;
};

/** 文件归类：与中间件 `FileCategory` 同一套档位，用于区分图标与类型筛选 */
export type FileCategory = 'video' | 'image' | 'pdf' | 'markdown' | 'app' | 'other';

/** 类型筛选的操作方式：多选（可勾多类）/ 单选（一次一类），在设置面板里切 */
export type TypeFilterMode = 'multi' | 'single';

/** 列表里的一条应用包（`.app`） */
export type AppEntry = {
  /** 显示名：文件名的 `.app` 后缀已去掉 */
  name: string;
  /** 应用包绝对路径，卸载时原样回传给中间件 */
  path: string;
  /** 包的最后修改时间（ISO 8601） */
  updatedAt: string;
  /** 最后修改时间（毫秒）：应用之间按它「新的在前」 */
  updatedMs: number;
  /** 是否系统自带：这类应用不给卸载入口 */
  system: boolean;
};

/** 列表里的一条文件 */
export type FileEntry = {
  /** 文件名（含扩展名） */
  name: string;
  /** 文件绝对路径 */
  path: string;
  /** 文件大小（字节） */
  size: number;
  /** 最后修改时间（ISO 8601） */
  updatedAt: string;
  /** 最后修改时间（毫秒）：同类别内按它「新的在前」 */
  updatedMs: number;
  /** 文件归类，用于区分图标与类型筛选 */
  category: FileCategory;
};

/** 能播放视频的本机应用（外部打开的目标） */
export type VideoAppOption = {
  /** 应用名，`open -a` 用它；设置里就当选中值 */
  name: string;
  /** 应用包绝对路径，仅用于展示与判重 */
  path: string;
};

/** 视频点击后的去向：弹窗预览 / 交给外部应用 */
export type VideoOpenMode = 'preview' | 'external';

/** 外部应用打开视频时，瓦片大图摆什么：视频帧 / 播放器图标 */
export type VideoThumbStyle = 'frame' | 'app-icon';

/** 一个卷的剩余可用空间 */
export type VolumeSpace = {
  /** 卷名：外接卷取挂载点最后一段；启动卷没有名字，为 null */
  name: string | null;
  /** 挂载点绝对路径（启动卷是 `/`） */
  mountPoint: string;
  /** 剩余可用字节 */
  freeBytes: number;
};

/** 目录所在的卷空间：启动卷恒有，目录在外接卷时再带那一卷 */
export type DirSpace = {
  /** 本机启动卷的剩余可用空间 */
  system: VolumeSpace;
  /** 当前目录所在的外接卷；目录不在外接卷上时为 null */
  external: VolumeSpace | null;
};

/** 一次目录扫描的结果 */
export type DirListing = {
  /** 当前目录绝对路径 */
  path: string;
  /** 当前目录名 */
  name: string;
  /** 父目录绝对路径；已是文件系统根时为 null */
  parent: string | null;
  /** 子文件夹（按名称排序） */
  folders: FolderEntry[];
  /** 直属应用包（按修改时间倒序，同刻按显示名） */
  apps: AppEntry[];
  /** 直属文件（先按类别、同类别内按修改时间倒序） */
  files: FileEntry[];
  /** 启动卷 / 外接卷的剩余空间；读不到时为 null，页面不显示这段描述 */
  space: DirSpace | null;
};

/** 目录取数 hook 的返回 */
export type UseFilesDirResult = {
  /** 当前目录扫描结果；还没选目录时为 null */
  listing: DirListing | null;
  /** 当前打开的目录绝对路径；空串表示还没选目录 */
  currentDir: string;
  /** 首次 / 切换目录加载中 */
  loading: boolean;
  /** 读取失败原因 */
  error: string | null;
  /** 打开指定目录（含路径校验由中间件收口） */
  openDir: (dir: string) => void;
  /** 调起系统目录选择器，选中后打开；取消则保持当前目录 */
  pickDir: () => void;
  /** 目录选择框正在等待用户选择：按钮据此显示进度 */
  picking: boolean;
  /** 手动刷新当前目录（显示 loading） */
  refresh: () => void;
  /** 静默刷新当前目录，供页面级刷新订阅 */
  reload: () => Promise<void>;
};

/** 收藏的一条目录：路径用于直达，名字用于列表展示 */
export type FavoriteEntry = {
  /** 目录绝对路径 */
  path: string;
  /** 目录名（列表展示用） */
  name: string;
  /** 是否固定在列表顶部；固定项不给移除按钮 */
  pinned: boolean;
};

/** 展示形式：网格瓦片 / 表格平铺 */
export type FilesViewMode = 'grid' | 'table';

/** 展示形式 hook 的返回 */
export type UseFilesViewModeResult = {
  /** 当前形态 */
  view: FilesViewMode;
  /** 是不是网格形态；页面据此决定渲染哪一份 */
  isGridView: boolean;
  /** 切到另一种形态并写回存储 */
  toggle: () => void;
};

/** 表格的一行：一个条目一行，文件夹在前、应用其次、文件在后（与网格同一顺序） */
export type FilesRow =
  | { kind: 'folder'; folder: FolderEntry }
  | { kind: 'app'; app: AppEntry }
  | { kind: 'file'; file: FileEntry };

/** 卸载前扫出来的一条残留 */
export type AppResidue = {
  /** 绝对路径 */
  path: string;
  /** 中文说明，直接进确认弹窗 */
  label: string;
};

/** 应用卸载前的中介报告：应用本体摘要 + 将一并删除的残留 */
export type AppResidueReport = {
  /** 应用本体摘要 */
  app: {
    /** 显示名 */
    name: string;
    /** 应用包绝对路径 */
    path: string;
    /** bundle id；读不到时为 null */
    bundleId: string | null;
    /** 是否系统自带（这类应用不给卸载入口） */
    system: boolean;
  };
  /** 应用本体之外、将一并删除的残留 */
  residues: AppResidue[];
};

/** 卸载结果 */
export type AppUninstallResult = {
  /** 已删除的绝对路径 */
  removed: string[];
  /** 删除失败的条目 */
  failed: { path: string; message: string }[];
};
