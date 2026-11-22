/**
 * 预览上面的两层浮窗：删除确认与子区域预览。
 *
 * 都开在主预览之上、各自只收自己那一层——取消删除不关预览，Esc 关子区域预览时
 * 底下这一篇同样留着。主预览只负责把状态交给这里，不参与它们的排版。
 *
 * 子区域预览有两个入口，共用同一层弹窗（`SectionPreview`），但阅读偏好（全屏 / 字号 / 目录宽度）
 * 各记一套（`variant` 决定存进哪套命名空间）：
 * - 同文档链接指向的一节：能前后切到哪几节按 `all` / `section` 口径算；
 * - 折叠块里的正文：能前后切到全文所有折叠块。
 * 两份的当前下标互不相干，同一时刻只会开着一个（上层盖住主预览时点不到正文）。
 */

import DeleteConfirm from '../DeleteConfirm';
import SectionPreview from '../SectionPreview';
import { listAnchorBlockPeers } from '../utils/anchor-blocks';
import { listDetailBlockPeers } from '../utils/details-blocks';

import type { PreviewOverlaysProps } from './types';

const PreviewOverlays = ({
  anchorBlock,
  anchorBlocks,
  anchorScope,
  detailBlock,
  detailBlocks,
  detailsScope,
  remove,
  removal,
  title,
}: PreviewOverlaysProps) => {
  /** 当前打开的那一节锚点区块；关着时为 null */
  const anchorSection =
    anchorBlock.index === null ? null : anchorBlocks[anchorBlock.index];
  /** 按当前口径能前后切到的那些节 */
  const anchorPeers = anchorSection
    ? listAnchorBlockPeers(anchorBlocks, anchorSection.anchor, anchorScope)
    : [];
  /** 按「全文 / 同一小节」口径算能切到的那几块折叠块 */
  const detailPeers = listDetailBlockPeers(
    detailBlocks,
    detailBlock.index,
    detailsScope,
  );

  return (
    <>
      {/* 删除确认层：开在主预览上面；取消只收这一层，确认后删除动作由调用方执行 */}
      <DeleteConfirm
        checkedKeys={removal.checkedKeys}
        choices={remove?.choices}
        description={remove?.description ?? ''}
        loading={removal.removing}
        onCancel={removal.cancel}
        onCheckedKeysChange={removal.setCheckedKeys}
        onConfirm={removal.confirm}
        opened={removal.confirming}
        title={title}
      />

      {/* 子区域预览：开在主预览上面，只看一段内容；Esc 只关它，底下这一篇留着 */}
      <SectionPreview
        index={anchorBlock.index}
        nextLabel="下一个链接区块"
        onClose={anchorBlock.close}
        onIndexChange={anchorBlock.setIndex}
        peers={anchorPeers}
        previousLabel="上一个链接区块"
        sections={anchorBlocks}
        variant="anchor"
      />

      {/* 折叠块预览：summary 点出来的那一段，样式 / 键位与上一份同一套，阅读偏好各记一套 */}
      <SectionPreview
        index={detailBlock.index}
        nextLabel="下一个折叠块"
        onClose={detailBlock.close}
        onIndexChange={detailBlock.setIndex}
        peers={detailPeers}
        previousLabel="上一个折叠块"
        sections={detailBlocks}
        variant="details"
      />
    </>
  );
};

export default PreviewOverlays;
