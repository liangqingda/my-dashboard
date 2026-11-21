/**
 * 预览上面的两层浮窗：删除确认与子区域预览。
 *
 * 都开在主预览之上、各自只收自己那一层——取消删除不关预览，Esc 关子区域预览时
 * 底下这一篇同样留着。主预览只负责把状态交给这里，不参与它们的排版。
 */

import AnchorBlockPreview from '../AnchorBlockPreview';
import DeleteConfirm from '../DeleteConfirm';

import type { PreviewOverlaysProps } from './types';

const PreviewOverlays = ({
  anchorBlock,
  anchorBlocks,
  anchorScope,
  remove,
  removal,
  title,
}: PreviewOverlaysProps) => (
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

    {/* 子区域预览：开在主预览上面，只看一块内容；Esc 只关它，底下这一篇留着 */}
    <AnchorBlockPreview
      blocks={anchorBlocks}
      index={anchorBlock.index}
      onClose={anchorBlock.close}
      onIndexChange={anchorBlock.setIndex}
      scope={anchorScope}
    />
  </>
);

export default PreviewOverlays;
