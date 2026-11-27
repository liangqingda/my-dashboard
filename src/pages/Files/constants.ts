/**
 * 文件浏览页的常量：存储键、占位文案、分类档位与骨架形状。
 * 文件归类（扩展名 → 分类）住在中间件 `scripts/vite/files-store.ts`，前端只消费分类键，
 * 不维护第二份扩展名表；分类的中文标签与筛选偏好归本页。
 */

import {
  IconApps,
  IconFile,
  IconFileText,
  IconMarkdown,
  IconPhoto,
  IconVideo,
} from '@tabler/icons-react';

import { createChoiceCodec } from '@/utils/local-storage';
import { scopedStorageKey } from '@/utils/page-storage';

import type {
  EntryGroupKey,
  FilesShortcut,
  FavoriteEntry,
  FileCategory,
  FilesViewMode,
} from './types';

/**
 * 这一页在 localStorage 里的页面标识：对应路由 `/files`
 * （拼法见 `@/utils/page-storage`）。
 */
export const FILES_STORAGE_SCOPE = 'files';

/** 上次打开的目录路径（刷新后回到同一个目录） */
export const CURRENT_DIR_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'current-dir',
);

/** 收藏的目录列表（路径 + 名字，刷新后保留） */
export const FAVORITES_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'favorites',
);

/** 视频点击后的去向（弹窗预览 / 外部应用打开） */
export const VIDEO_OPEN_MODE_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'video-open-mode',
);

/** 外部应用打开视频时，瓦片大图摆视频帧还是播放器图标 */
export const VIDEO_THUMB_STYLE_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'video-thumb-style',
);

/** 外部打开用的应用名；没写过就用默认播放器 */
export const VIDEO_APP_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'video-app',
);

/** 图片预览弹窗打开时是否直接进全屏 */
export const IMAGE_PREVIEW_FULLSCREEN_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'image-preview-fullscreen',
);

/** 视频预览弹窗打开时是否直接进全屏 */
export const VIDEO_PREVIEW_FULLSCREEN_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'video-preview-fullscreen',
);

/** hover 玻璃层的透明度（0–100）：设置里用滑块调，默认 100 */
export const VEIL_OPACITY_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'veil-opacity',
);

/**
 * 瓦片宽度的存储键：语义从「列宽下限」改成「实际瓦片宽度」时值域没变（都是像素），
 * 键名沿用旧称，避免用户已经调好的那一档在升级后回到默认。
 */
export const TILE_WIDTH_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'tile-min-width',
);

/**
 * 网格瓦片宽度（px）：设置面板「瓦片宽度」调的就是它，决定网格**一列至少多宽**。
 * 实际列数按内容区宽度算、列宽由剩余空间均分铺满（口径见 `DirectoryGrid/README.md`），
 * 所以列数不变时相邻档位看不出外框变化——这是「铺满整行」的必然结果。
 * 可调区间见下方 `TILE_WIDTH_*`：再窄图源与名称会挤成一条，再宽一屏只剩一两列；
 * 默认值 168 落在区间内且是步长的整数倍，滑块才能正好停在默认档。
 */
export const DEFAULT_TILE_WIDTH = 168;

/** 可调下限（px） */
export const TILE_WIDTH_MIN = 120;

/** 可调上限（px）：248 时一屏还能排五六列，再宽就只剩三四列、列宽也被铺满拉得很开 */
export const TILE_WIDTH_MAX = 248;

/** 滑块步长（px） */
export const TILE_WIDTH_STEP = 8;

/**
 * 网格列间距（px）：样式里的 `gap` 与「按容器宽度算列数」共用这一个值，
 * 两边必须一致，否则最后一列会算出多余的空白或挤不下。
 */
export const TILE_GRID_GAP = 12;

/**
 * 网格图源基准边长（px）：分类图标、应用图标固定按这个基准换算；缩略图与文件夹图源自适应瓦片宽度。
 */
export const DEFAULT_TILE_MEDIA_SIZE = 96;

/**
 * 分类图标、应用图标画成图源基准边长的多少：方形整块占 62%，与缩略图的视觉分量相当。
 */
export const TILE_ICON_SCALE = 0.62;

/** 外部打开的默认应用：IINA（没装时中间件会回落到它名下，再不行才系统默认） */
export const DEFAULT_VIDEO_APP = 'IINA';

/** 首屏骨架块的数量：只为给一个「正在读」的形状，不假装有数据 */
export const SKELETON_TILES: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7];

/** 分类键 → 中文标签；键的集合与中间件 `FileCategory` 对齐 */
export const FILE_CATEGORY_LABELS: Record<FileCategory, string> = {
  video: '视频',
  image: '图片',
  pdf: 'PDF',
  markdown: 'Markdown',
  app: 'App',
  other: '其它',
};

/** 条目类型 → 中文名词：表格「类别」列与操作按钮 tooltip 共用同一份 */
export const ENTRY_KIND_LABELS = {
  folder: '文件夹',
  app: '应用',
  file: '文件',
} as const;

/**
 * 这一页认的快捷键：**唯一一份**，设置面板「快捷键」组直接读它。
 *
 * 加 / 改任何键位（列表的点选、待拖拽区的 Space / Esc、`⌘↑` 回上一级、弹窗里的 C 与 Esc）
 * 都要同步改这里——否则设置面板上写的就是过期的说明。键位真正生效的地方：
 * `MenuContentLayout` 的 `onSpace` / `onEscape` / `onNavigateParent`、`utils/entry-click.ts`
 * 与 `FreeModal` 的 `extraKeys`。
 */
export const FILES_SHORTCUTS: readonly FilesShortcut[] = [
  { action: '待拖拽区非空时，点条目＝加入 / 移出', keys: ['点击'] },
  { action: '按打开的走：进目录 / 预览图片视频（攒批时也能跳出去）', keys: ['⌘', '点击'] },
  { action: '从上次点的那一条连选到这里', keys: ['Shift', '点击'] },
  { action: '清空待拖拽区', keys: ['Space'] },
  { action: '清空待拖拽区 / 关闭弹窗', keys: ['Esc'] },
  { action: '回到上一级目录', keys: ['⌘', '↑'] },
  { action: '移动弹窗里收藏 / 取消收藏当前目录', keys: ['C'] },
];

/** 分组键的固定顺序：文件夹 → 应用 → 文件分类，与平铺顺序一致 */
export const ENTRY_GROUP_KEYS: readonly EntryGroupKey[] = [
  'folder',
  'app',
  'video',
  'image',
  'pdf',
  'markdown',
  'other',
];

/** 分组键 → 中文标题：文件夹 / 应用沿用条目类型名，文件分类沿用分类标签 */
export const ENTRY_GROUP_LABELS: Record<EntryGroupKey, string> = {
  folder: ENTRY_KIND_LABELS.folder,
  app: ENTRY_KIND_LABELS.app,
  video: FILE_CATEGORY_LABELS.video,
  image: FILE_CATEGORY_LABELS.image,
  pdf: FILE_CATEGORY_LABELS.pdf,
  markdown: FILE_CATEGORY_LABELS.markdown,
  other: FILE_CATEGORY_LABELS.other,
};

/** 展示形式（网格 / 表格）的存储键：刷新页面重新进入后保持上次切换到的形态 */
export const VIEW_MODE_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'view-mode',
);

/** 展示形式的编解码：只认 grid / table，写坏的存储值回落网格 */
export const VIEW_MODE_CODEC = createChoiceCodec<FilesViewMode>(
  ['grid', 'table'],
  'grid',
);

/** 分类键的固定顺序：筛选档位、全选判断都按这一份 */
export const FILE_CATEGORY_VALUES = Object.keys(
  FILE_CATEGORY_LABELS,
) as FileCategory[];

/**
 * 类型筛选下拉的选项（按上面的固定顺序）。
 * 是页面固定档位：不随当前目录里有没有该类型而增减。
 */
export const FILE_CATEGORY_OPTIONS = FILE_CATEGORY_VALUES.map((value) => ({
  label: FILE_CATEGORY_LABELS[value],
  value,
}));

/** 当前勾选的分类（多选是若干项，单选是一或全部）；刷新后保留，没写过时全选 */
export const TYPE_FILTER_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'type-filter-selected',
);

/** 类型筛选的操作方式（多选 / 单选），在设置面板里切；没写过时多选 */
export const TYPE_FILTER_MODE_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'type-filter-mode',
);

/**
 * 拖拽移动的走法：弹窗挑目标 / 直接拖到列表里的文件夹；
 * 没写过时走弹窗（与旧行为一致）
 */
export const MOVE_MODE_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'move-mode',
);

/** 列表是否按类型分组成段展示（文件夹 / 应用 / 文件），在设置面板里切；没写过时平铺 */
export const GROUPED_DISPLAY_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'grouped-display',
);

/** 页面安全锁是否开启（进入前先输密码）；没写过时关闭 */
export const LOCK_ENABLED_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'lock-enabled',
);

/** 页面安全锁的密码：原样存一份，不做任何强度 / 格式限制；空串表示还没设 */
export const LOCK_PASSWORD_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'lock-password',
);

/** 「全部」那一项在筛选列表里固定排最上面 */
export const TYPE_FILTER_ALL_LABEL = '全部';

/** 分类 → 瓦片图标；视频额外上蓝色，应用走通用应用图标，其余用通用弱色 */
export const CATEGORY_ICONS: Record<FileCategory, typeof IconFile> = {
  video: IconVideo,
  image: IconPhoto,
  pdf: IconFileText,
  markdown: IconMarkdown,
  app: IconApps,
  other: IconFile,
};

/**
 * 系统应用程序目录入口：macOS 的系统应用装在根目录下的 `/Applications`，
 * 而用户主目录里可能也有一个同名 `Applications`（Chrome 应用快捷方式之类），打开后者
 * 会看不到任何应用。首次进入文件页时把它预置成一条「已固定」的收藏，之后与其余条目一样
 * 可取消固定、拖动排序或移除。
 */
export const SYSTEM_APPS_FAVORITE = {
  name: '系统应用程序',
  path: '/Applications',
  pinned: true,
} as const;

/** 首次打开时预置的收藏：系统应用目录固定在最上面；之后可取消固定 / 移除 */
export const DEFAULT_FAVORITES: FavoriteEntry[] = [SYSTEM_APPS_FAVORITE];
