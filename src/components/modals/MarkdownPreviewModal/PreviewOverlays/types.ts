import type { AnchorBlockNavigationState } from '../hooks/useAnchorBlockNavigation';
import type { DetailsBlockNavigationState } from '../hooks/useDetailsBlockNavigation';
import type { RemoveRequestState } from '../hooks/useRemoveRequest';
import type {
  AnchorNavScope,
  DetailsNavScope,
  MarkdownAnchorBlock,
  MarkdownDetailBlock,
  MarkdownPreviewRemove,
} from '../types';

/**
 * 预览上层两层浮窗（删除确认 / 子区域预览）的入参：
 * 状态与动作都由主预览的 hook 交给它，这里不做判断。
 */
export type PreviewOverlaysProps = {
  /** 当前这篇的标题 */
  title: string;
  /** 锚点区块子预览的导航状态 */
  anchorBlock: AnchorBlockNavigationState;
  /** 当前这篇的锚点区块（正文里 h1–h4 切出来） */
  anchorBlocks: MarkdownAnchorBlock[];
  /** 锚点区块前后切换的口径 */
  anchorScope: AnchorNavScope;
  /** 折叠块子预览的导航状态 */
  detailBlock: DetailsBlockNavigationState;
  /** 当前这篇的折叠块（`<details>` 里那段内容） */
  detailBlocks: MarkdownDetailBlock[];
  /** 折叠块前后切换的口径 */
  detailsScope: DetailsNavScope;
  /** 页面标识（路由）：两层子预览的阅读偏好按 `<标识>:…` 各记一套 */
  storageScope: string;
  /** 删除配置：不传就没有删除确认层 */
  remove?: MarkdownPreviewRemove;
  /** 删除确认层的状态 */
  removal: RemoveRequestState;
};
