import { IconFolderFilled } from '@tabler/icons-react';

import { CATEGORY_ICONS } from '../constants';
import type { DraggableEntry } from '../types';

/**
 * 条目的图标：文件夹用文件夹图标，文件按分类取（与表格行、瓦片、拖拽弹窗同一套）。
 * 拖拽影像、弹窗内待拖拽区、侧栏待拖拽区都靠它，避免几处各写一份 `'category' in entry` 判断。
 */
export const entryIcon = (entry: DraggableEntry) =>
  'category' in entry ? CATEGORY_ICONS[entry.category] : IconFolderFilled;
