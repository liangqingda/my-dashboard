/**
 * 子区域预览的装配：把「当前是第几块」翻成弹窗要的 props，前后切换也在这里走。
 *
 * 真正看内容的界面在 `AnchorBlockModal`，这一层只管位置与边界：
 * 按当前口径（全文所有链接 / 只同一处目录里的链接）算出「这一次能切到哪几块」，
 * 到头的那一侧给 `null`（按钮置灰），下标越界（换篇后正文变短）时当作关着。
 *
 * 快捷键也挂在这里：子预览开着时，`]` / → 切下一块、`[` / ← 切上一块，跟 header 上那两个
 * 图标按钮同一套键位。主预览的「翻篇」快捷键在同一时刻是停用的（那边翻的是文档），
 * 所以这两组键不会打架。
 */

import type { AnchorBlockPreviewProps } from '../types';
import AnchorBlockModal from '../AnchorBlockModal';
import { useNavigationShortcuts } from '../hooks/useNavigationShortcuts';
import { listAnchorBlockPeers } from '../utils/anchor-blocks';

const AnchorBlockPreview = ({
  blocks,
  index,
  onClose,
  onIndexChange,
  scope,
}: AnchorBlockPreviewProps) => {
  const block = index !== null && index < blocks.length ? blocks[index] : null;
  /** 这一轮能切到哪几块（下标）：`section` 口径只含同一处目录里的那几个链接 */
  const peers = block ? listAnchorBlockPeers(blocks, block.anchor, scope) : [];
  /** 当前块在这条列表里的位置；-1 表示没对上，按关着处理 */
  const cursor = index === null ? -1 : peers.indexOf(index);
  const previous = cursor > 0 ? peers[cursor - 1] : null;
  const next =
    cursor >= 0 && cursor < peers.length - 1 ? peers[cursor + 1] : null;

  /**
   * 只在子预览开着时接管按键：关了就得把 `]` / → 还给底下的翻篇。
   * 按键只切块、不把焦点挪到按钮上（焦点环全站关闭，见 `src/main.tsx`）。
   */
  useNavigationShortcuts({
    enabled: block !== null,
    onNext: next === null ? null : () => onIndexChange(next),
    onPrevious: previous === null ? null : () => onIndexChange(previous),
  });

  return (
    <AnchorBlockModal
      block={block}
      onClose={onClose}
      onNext={next === null ? null : () => onIndexChange(next)}
      onPrevious={previous === null ? null : () => onIndexChange(previous)}
      position={cursor < 0 ? null : { index: cursor + 1, total: peers.length }}
    />
  );
};

export default AnchorBlockPreview;
