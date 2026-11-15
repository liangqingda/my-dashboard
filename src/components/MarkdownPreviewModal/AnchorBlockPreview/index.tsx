/**
 * 子区域预览的装配：把「当前是第几块」翻成弹窗要的 props，前后切换也在这里走。
 *
 * 真正看内容的界面在 `AnchorBlockModal`，这一层只管位置与边界：
 * 到头的那一侧给 `null`（按钮置灰），下标越界（换篇后正文变短）时当作关着。
 */

import type { AnchorBlockPreviewProps } from '../types';
import AnchorBlockModal from '../AnchorBlockModal';

const AnchorBlockPreview = ({
  blocks,
  index,
  onClose,
  onIndexChange,
}: AnchorBlockPreviewProps) => {
  const block =
    index !== null && index < blocks.length ? blocks[index] : null;

  return (
    <AnchorBlockModal
      block={block}
      onClose={onClose}
      onNext={
        index !== null && index < blocks.length - 1
          ? () => onIndexChange(index + 1)
          : null
      }
      onPrevious={
        index !== null && index > 0 ? () => onIndexChange(index - 1) : null
      }
      position={
        index === null ? null : { index: index + 1, total: blocks.length }
      }
    />
  );
};

export default AnchorBlockPreview;
