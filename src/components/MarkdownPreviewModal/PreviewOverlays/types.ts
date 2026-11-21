import type { AnchorBlockNavigationState } from '../hooks/useAnchorBlockNavigation';
import type { RemoveRequestState } from '../hooks/useRemoveRequest';
import type {
  AnchorNavScope,
  MarkdownAnchorBlock,
  MarkdownPreviewRemove,
} from '../types';

/** 预览上层两层浮窗（删除确认 / 子区域预览）的入参：状态与动作都由主预览的 hook 交给它 */
export type PreviewOverlaysProps = {
  /** 当前这篇的标题 */
  title: string;
  /** 子区域预览的导航状态 */
  anchorBlock: AnchorBlockNavigationState;
  /** 当前这篇的锚点区块（正文里 h1–h4 切出来） */
  anchorBlocks: MarkdownAnchorBlock[];
  /** 子区域前后切换的口径 */
  anchorScope: AnchorNavScope;
  /** 删除配置：不传就没有删除确认层 */
  remove?: MarkdownPreviewRemove;
  /** 删除确认层的状态 */
  removal: RemoveRequestState;
};
