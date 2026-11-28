/**
 * 程序坞里的 Markdown 阅读窗：优先用页面登记的最新正文与操作能力，
 * 页面已经卸载时退回快照只读。
 *
 * 页面弹窗收起只是隐藏（`onMinimize` 保留 active 内容），所以恢复出来的窗口
 * 能与页面里那一扇共用同一套编辑 / 筛选 / 刷新 / 删除按钮；唯一差别是
 * 「收起到程序坞」这颗按钮在程序坞里变成「最小化到程序坞」。
 */

import MarkdownPreviewModal from '@/components/modals/MarkdownPreviewModal';
import type { MarkdownPreviewRemove } from '@/components/modals/MarkdownPreviewModal';
import { useMarkdownDockActions } from '@/components/modals/MarkdownPreviewModal/DockActions/hooks/useMarkdownDockActions';

import type { DockWindowProps } from '../types';

const MarkdownWindow = ({ entry, onRequestClose }: DockWindowProps) => {
  const actions = useMarkdownDockActions(entry.id);

  if (entry.kind !== 'markdown-preview') {
    return null;
  }

  if (actions === null) {
    return (
      <MarkdownPreviewModal
        dockOrigin="dock"
        markdown={entry.snapshot.markdown}
        onClose={onRequestClose}
        opened
        relativePath={entry.snapshot.relativePath}
        storageScope={entry.snapshot.storageScope}
        title={entry.snapshot.title}
      />
    );
  }

  /** 删除成功后程序坞这一窗也要收掉；页面那边的 remove 已经负责刷新列表 */
  const remove: MarkdownPreviewRemove | undefined =
    actions.remove === undefined
      ? undefined
      : {
          ...actions.remove,
          confirm: async (checkedKeys) => {
            await actions.remove?.confirm(checkedKeys);
            onRequestClose();
          },
        };

  return (
    <MarkdownPreviewModal
      {...actions}
      dockOrigin="dock"
      onClose={onRequestClose}
      opened
      remove={remove}
    />
  );
};

export default MarkdownWindow;
