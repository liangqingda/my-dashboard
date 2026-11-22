/**
 * 视频页的类型定义。
 * 数据来自 Vite 中间件 `/api/videos` 对本机目录的只读扫描（见 `docs/local-repo-data.md`），
 * 页面只消费列表摘要，不读文件内容。
 */

/** 列表里的一条子文件夹 */
export type VideoFolderEntry = {
  /** 文件夹名（不含路径） */
  name: string;
  /** 文件夹绝对路径，点开时原样回传给中间件 */
  path: string;
  /** 直属视频文件数（不递归子目录） */
  videoCount: number;
};

/** 列表里的一条视频文件 */
export type VideoFileEntry = {
  /** 文件名（含扩展名） */
  name: string;
  /** 文件绝对路径 */
  path: string;
  /** 文件大小（字节） */
  size: number;
  /** 最后修改时间（ISO 8601） */
  updatedAt: string;
};

/** 一次目录扫描的结果 */
export type VideoDirListing = {
  /** 当前目录绝对路径 */
  path: string;
  /** 当前目录名 */
  name: string;
  /** 父目录绝对路径；已是文件系统根时为 null */
  parent: string | null;
  /** 子文件夹（按名称排序） */
  folders: VideoFolderEntry[];
  /** 直属视频文件（按名称排序） */
  videos: VideoFileEntry[];
};

/** 目录取数 hook 的返回 */
export type UseVideoDirResult = {
  /** 当前目录扫描结果；还没选目录时为 null */
  listing: VideoDirListing | null;
  /** 当前打开的目录绝对路径；空串表示还没选目录 */
  currentDir: string;
  /** 首次 / 切换目录加载中 */
  loading: boolean;
  /** 读取失败原因 */
  error: string | null;
  /** 打开指定目录（含路径校验由中间件收口） */
  openDir: (dir: string) => void;
  /** 手动刷新当前目录（显示 loading） */
  refresh: () => void;
  /** 静默刷新当前目录，供页面级刷新订阅 */
  reload: () => Promise<void>;
};
