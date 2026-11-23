import { FILE_CATEGORY_VALUES, SYSTEM_APPS_FAVORITE } from '../constants';
import type { FileCategory, TypeFilterMode } from '../types';

/** 筛选交互需要的当前状态与回调：页面只负责把 hook 的结果接到按钮组 */
export type FilesFilterActionsParams = {
  /** 当前所在目录；null 表示还没选目录 */
  currentPath: string | null;
  /** 当前勾选的分类 */
  selectedCategories: FileCategory[];
  /** 换一批勾选的分类 */
  onSelectedCategoriesChange: (next: FileCategory[]) => void;
  /** 打开某个目录（切目录时页面会先清临时状态） */
  openDir: (dir: string) => void;
  /** 改筛选方式（多选 / 单选），持久化在设置里 */
  setFilterMode: (mode: TypeFilterMode) => void;
};

/**
 * 筛选面板的交互编排：
 * - 只勾「App」时自动切到收藏里的系统应用目录（当前已在那个目录就不再打开），免得停在
 *   没有应用的目录看到空列表；
 * - 多选切单选时，选择不是「恰好一类」就收敛成全部，免得单选列表一个都没选中。
 */
export const useFilesFilterActions = ({
  currentPath,
  onSelectedCategoriesChange,
  openDir,
  selectedCategories,
  setFilterMode,
}: FilesFilterActionsParams) => {
  const changeSelectedCategories = (next: FileCategory[]) => {
    const onlyApp = next.length === 1 && next[0] === 'app';
    const wasOnlyApp =
      selectedCategories.length === 1 && selectedCategories[0] === 'app';

    onSelectedCategoriesChange(next);

    if (onlyApp && !wasOnlyApp && currentPath !== SYSTEM_APPS_FAVORITE.path) {
      openDir(SYSTEM_APPS_FAVORITE.path);
    }
  };

  const changeFilterMode = (mode: TypeFilterMode) => {
    setFilterMode(mode);

    if (mode === 'single' && selectedCategories.length !== 1) {
      onSelectedCategoriesChange([...FILE_CATEGORY_VALUES]);
    }
  };

  return { changeFilterMode, changeSelectedCategories };
};
