/**
 * 页面这一侧把当前正文与操作能力登记给程序坞窗口。
 * 页面弹窗收起只是隐藏（见 `onMinimize`），所以这里读到的仍是同一份正文与回调。
 */

import { useMemo } from 'react';
import type { ComponentType } from 'react';

import { useProvideMarkdownDockActions } from '../DockActions/hooks/useProvideMarkdownDockActions';
import type {
  MarkdownDockActions,
  MarkdownEditorProps,
  MarkdownPreviewRemove,
} from '../types';
import type { MarkdownPreviewFilter } from '../types/filter';

type UseDockPreviewActionsParams = {
  /** 程序坞描述 id；程序坞窗口自己不登记 */
  id: string | undefined;
  title: string;
  markdown: string;
  loading?: boolean;
  position?: { index: number; total: number };
  relativePath?: string;
  onClose: () => void;
  onPrevious?: (() => void) | null;
  onNext?: (() => void) | null;
  onRefresh?: (() => Promise<void> | void) | null;
  onSave?: (markdown: string) => Promise<{ notice?: string }>;
  Editor?: ComponentType<MarkdownEditorProps>;
  filter?: MarkdownPreviewFilter;
  remove?: MarkdownPreviewRemove;
  storageScope: string;
};

export const useDockPreviewActions = ({
  Editor,
  filter,
  id,
  loading,
  markdown,
  onClose,
  onNext,
  onPrevious,
  onRefresh,
  onSave,
  position,
  relativePath,
  remove,
  storageScope,
  title,
}: UseDockPreviewActionsParams): void => {
  const positionIndex = position?.index;
  const positionTotal = position?.total;

  const actions = useMemo<MarkdownDockActions>(
    () => ({
      Editor,
      filter,
      loading,
      markdown,
      onClose,
      onNext,
      onPrevious,
      onRefresh,
      onSave,
      position:
        positionIndex === undefined || positionTotal === undefined
          ? undefined
          : { index: positionIndex, total: positionTotal },
      relativePath,
      remove,
      storageScope,
      title,
    }),
    [
      Editor,
      filter,
      loading,
      markdown,
      onClose,
      onNext,
      onPrevious,
      onRefresh,
      onSave,
      positionIndex,
      positionTotal,
      relativePath,
      remove,
      storageScope,
      title,
    ],
  );

  useProvideMarkdownDockActions(id, actions);
};
