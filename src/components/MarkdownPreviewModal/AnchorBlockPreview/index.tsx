/**
 * 子区域预览的装配：把「当前是第几块」翻成弹窗要的 props，前后切换也在这里走。
 *
 * 真正看内容的界面在 `AnchorBlockModal`，这一层只管位置与边界：
 * 按当前口径（全文所有链接 / 只同一处目录里的链接）算出「这一次能切到哪几块」，
 * 到头的那一侧给 `null`（按钮置灰），下标越界（换篇后正文变短）时当作关着。
 */

import type { AnchorBlockPreviewProps } from '../types';
import AnchorBlockModal from '../AnchorBlockModal';
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
