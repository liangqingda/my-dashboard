/**
 * 程序坞里的 Markdown 阅读窗：按快照重建正文，不依赖原页面。
 *
 * 页面里的编辑、筛选、删除都是页面语义（回调与草稿都在那一页），恢复窗口只保留阅读：
 * 正文字号、目录、链接与折叠块仍可用，全屏偏好按同一个 `storageScope` 记住。
 */

import MarkdownPreviewModal from '@/components/modals/MarkdownPreviewModal';

import type { DockWindowProps } from '../types';

const MarkdownWindow = ({ entry, onRequestClose }: DockWindowProps) => {
  if (entry.kind !== 'markdown-preview') {
    return null;
  }

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
};

export default MarkdownWindow;
