import type { ProseFontScale } from '../hooks/useProseFontScale';
import type {
  AnchorLinkBehavior,
  AnchorNavScope,
  DetailsBlockBehavior,
  DetailsNavScope,
  PreviewPanel,
} from '../types';
import type {
  MarkdownFilterNavigation,
  MarkdownPreviewFilter,
} from '../types/filter';

/** 预览态 header 第一组操作（阅读类）的入参：复制 / 筛选 / 字号 / 文档内交互 / 刷新 */
export type DocumentActionsProps = {
  /** 文档的相对路径；不传就没有复制按钮 */
  relativePath?: string;
  /** 正文筛选；不传就没有筛选按钮 */
  filter?: MarkdownPreviewFilter;
  /** 正文字号的用户偏移 */
  fontScale: ProseFontScale;
  /** 同文档链接的点击行为 */
  anchorBehavior: AnchorLinkBehavior;
  /** 换一种链接行为（跨篇记住） */
  onAnchorBehaviorChange: (behavior: AnchorLinkBehavior) => void;
  /** 子区域预览的前后切换口径 */
  anchorScope: AnchorNavScope;
  /** 换一种前后切换口径（跨篇记住） */
  onAnchorScopeChange: (scope: AnchorNavScope) => void;
  /** 折叠块里那段内容的点击行为 */
  detailsBehavior: DetailsBlockBehavior;
  /** 换一种折叠块行为（跨篇记住） */
  onDetailsBehaviorChange: (behavior: DetailsBlockBehavior) => void;
  /** 折叠块子预览的前后切换口径 */
  detailsScope: DetailsNavScope;
  /** 换一种折叠块切换口径（跨篇记住） */
  onDetailsScopeChange: (scope: DetailsNavScope) => void;
  /** 文档里有没有同文档锚点链接 */
  hasAnchorLinks: boolean;
  /** 文档里有没有折叠块 */
  hasDetailBlocks: boolean;
  /** 正文是否还在取 */
  loading: boolean;
  /** 当前打开的 header 弹层 */
  panel: PreviewPanel | null;
  /** 开合 header 弹层 */
  onPanelChange: (panel: PreviewPanel | null) => void;
  /** 关键词命中导航：交给筛选面板挂回车切换 */
  highlightNavigation: MarkdownFilterNavigation | null;
  /** 刷新正文；null 表示不提供 */
  onRefresh: (() => void) | null;
  /** 刷新是否在 loading */
  refreshing: boolean;
};
