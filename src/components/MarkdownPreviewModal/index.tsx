/**
 * Markdown 预览弹窗（公共组件）。
 *
 * 全站所有 Markdown 弹窗预览都必须使用这个组件，不要各自拼装 Modal 与渲染器：
 * 它统一了文档排版、上一篇 / 下一篇导航（header 标题左侧按钮 + `[` / `]` 与 ← / → 快捷键）、
 * 弹窗左侧固定的标题目录 sidebar（文档内 h1–h4 目录，随弹窗高度拉伸、目录自身滚动，
 * 滚动正文时跟随高亮当前小节）、header 右侧的一排操作：复制文档的相对路径（调用方给路径）、
 * 筛选正文（口径由调用方给）、正文字号（跨篇记住的阅读偏好）、同文档锚点链接的打开方式、
 * 全屏预览（把整个框体铺满视口放大阅读空间，再点一次切回常规）
 * 与编辑 / 预览 / 保存 / 放弃改动，全部只留图标 + tooltip。
 * 组件只负责编辑态与保存流程，不知道文档结构和文件落在哪里：
 * 具体怎么编辑由调用方通过 `Editor` 插槽传入，没有定制编辑器时给出定制提示。
 *
 * 同文档锚点链接（`[文字](#锚点)`）有两种行为，由 header 上那个图标按钮决定并跨篇记住：
 * - `jump`：在当前正文里滚到锚点（默认，等于浏览器原行为）；
 * - `modal`：把锚点指向的那一节（到下一个同级或更高级标题为止）单独开窗，
 *   header 左侧按正文顺序前后切换、右侧只有字号 / 全屏 / 关闭。
 *
 * 这里的职责只有 Modal 骨架与装配：
 * - 标题栏一行（翻篇 / 计数 / 文件名 / 文档操作 / 编辑流程）→ `title-bar`
 * - 正文工作区（标题目录 + 阅读 / 编辑区）→ `preview-workspace`
 * - 锚点区块的开合与链接点击 → `hooks/use-anchor-block-navigation` + `anchor-block-preview`
 * - 正文字号的状态 → `hooks/use-prose-font-scale`
 * - header 右侧的操作与状态提示 → `header-actions`
 * - 编辑态状态机 → `hooks/use-note-editing`
 * - 翻篇快捷键与按钮焦点 → `hooks/use-step-navigation`
 */

import { useMemo, useState } from 'react';
import { Modal } from '@mantine/core';

import { cx } from '@/utils/cx';

import type { MarkdownPreviewModalProps, PreviewPanel } from './types';
import TitleBar from './TitleBar';
import PreviewWorkspace from './PreviewWorkspace';
import AnchorBlockPreview from './AnchorBlockPreview';
import { collectAnchorBlocks } from './utils/anchor-blocks';
import { withSideEffect } from './utils/with-side-effect';
import { useAnchorBlockNavigation } from './hooks/useAnchorBlockNavigation';
import { useAnchorLinkBehavior } from './hooks/useAnchorLinkBehavior';
import { useAnchorNavScope } from './hooks/useAnchorNavScope';
import { useCloseRequest } from './hooks/useCloseRequest';
import { useModalFullscreen } from './hooks/useModalFullscreen';
import { useNoteEditing } from './hooks/useNoteEditing';
import { useProseFontScale } from './hooks/useProseFontScale';
import { useRefreshPreview } from './hooks/useRefreshPreview';
import { useNavigationShortcuts } from './hooks/useNavigationShortcuts';

import styles from './index.scss';

export type {
  AnchorBlockModalProps,
  AnchorLinkBehavior,
  AnchorLinkControlProps,
  MarkdownAnchorBlock,
  MarkdownEditorHandle,
  MarkdownEditorProps,
  MarkdownPreviewFilter,
  MarkdownPreviewModalProps,
} from './types';

const MarkdownPreviewModal = ({
  opened,
  title,
  markdown,
  loading = false,
  position,
  relativePath,
  filter,
  onClose,
  onPrevious,
  onNext,
  onRefresh,
  onSave,
  Editor,
}: MarkdownPreviewModalProps) => {
  /**
   * header 上的就近弹层：同一时刻只开一块（筛选用 `filter`、字号用 `font`、
   * 同文档链接打开方式用 `anchor`），由弹窗持有是为了换篇、刷新、进编辑、关弹窗时统一收起——
   * 面板说的永远是当前这一次阅读。
   */
  const [panel, setPanel] = useState<PreviewPanel | null>(null);

  /** 全屏开关：记住的展示偏好，关闭弹窗也不重置；Esc 不归它管，永远是关弹窗 */
  const { fullscreen, toggle: toggleFullscreen } = useModalFullscreen();
  /** 正文字号的用户偏移：跨篇、跨会话记住，叠在常规 / 全屏各自的默认字号上 */
  const proseFont = useProseFontScale();
  /** 刷新按钮的 loading 与失败提示都在这个 hook 里 */
  const { refresh, refreshing } = useRefreshPreview(onRefresh);

  const editing = useNoteEditing({
    documentTitle: title,
    hasEditor: Boolean(Editor),
    markdown,
    onSave,
  });

  /** 关闭请求：编辑态（含草稿预览）不关，只提示先退出编辑，其余照常关 */
  const requestClose = useCloseRequest({
    blocking: editing.editing,
    onClose,
    previewing: editing.previewing,
  });

  /** 编辑态里点了「预览」：正文换成草稿的渲染结果，编辑器还挂在原地 */
  const showingDraftPreview = editing.editing && editing.previewing;
  /** 正文区当前要渲染的内容：预览草稿时用草稿，其余用正文 */
  const renderedMarkdown =
    showingDraftPreview && editing.draft !== null ? editing.draft : markdown;

  /**
   * 同文档链接指向的区块，按正文顺序排：子区域预览的翻页与「要不要开弹窗」都靠它。
   *
   * 取的是**未筛选**的正文：筛选只影响「读」，区块内容不该因为筛掉了目录行就取不到；
   * 编辑态（含草稿预览）也照旧按渲染内容算，草稿里改了链接同样能点。
   */
  const anchorBlocks = useMemo(
    () => collectAnchorBlocks(renderedMarkdown),
    [renderedMarkdown],
  );

  /** 同文档链接的点击行为：跨篇记住的阅读偏好 */
  const anchorLink = useAnchorLinkBehavior();
  /** 子区域预览的前后切换口径：同样是跨篇记住的阅读偏好 */
  const anchorScope = useAnchorNavScope();
  /**
   * 子区域预览的开合与正文链接点击：它开在主预览上面，
   * 点链接时按当前行为决定「跳过去」还是「弹窗打开那一块」。
   */
  const anchorBlock = useAnchorBlockNavigation({
    beforeOpen: () => setPanel(null),
    behavior: anchorLink.behavior,
    blocks: anchorBlocks,
  });

  /** 翻篇 / 刷新 / 进编辑 / 关弹窗前先收起浮层：它们说的都是「当前这一篇」 */
  const closeOverlays = () => {
    setPanel(null);
    anchorBlock.close();
  };

  const withPanelsClosed = (action: (() => void) | null | undefined) =>
    withSideEffect(closeOverlays, action);

  /**
   * 翻篇快捷键。子区域预览开着时停用：那时的 `]` / → 归子预览切块，
   * 不该把底下那一篇偷偷换掉。
   *
   * 按键只执行动作、**不把焦点挪到按钮上**：键盘触发完按钮上再留一圈焦点环，
   * 看着像「刚才点的是这个按钮」，还会改掉后面的 Tab 起点；全站也关了焦点环
   * （`focusRing: 'never'`，见 `src/main.tsx`）。
   */
  useNavigationShortcuts({
    enabled:
      opened && !editing.editing && !loading && anchorBlock.index === null,
    onNext: withPanelsClosed(onNext),
    onPrevious: withPanelsClosed(onPrevious),
  });

  /** 进入编辑时清掉弹层与子区域预览：新的一轮不该还亮着上一轮的位置 */
  const startEditing = () => {
    closeOverlays();
    editing.startEditing();
  };

  /**
   * 关闭请求包一层：先把弹层与子区域预览收掉再走原流程。
   * 弹窗关掉时内容会卸载，状态留着会在重新打开时自己弹出来。
   */
  const handleClose = () => {
    closeOverlays();
    requestClose();
  };

  /*
   * 编辑态（含草稿预览）关不掉：关闭按钮不渲染，Esc / 点遮罩统一走 `requestClose`（不关、只提示）。
   * 唯一出口是 header 的返回箭头：草稿预览时回编辑器，编辑时退出编辑（有未保存改动先确认），
   * 退出后关闭按钮与全屏才回来。全屏也一并收掉：这时要看的是块编辑器。
   *
   * Esc 的归属：header 弹层开着时只收面板（`closeOnEscape` 关掉）；
   * 子区域预览开着时同理——那个弹窗自己响应 Esc，底下这一篇不该被一起关掉。
   * 全屏不参与判定：Esc 一律关掉弹窗，全屏跟着一起关——同一个键在两种模式下意思不同，
   * 用户只会记住那一次「按了没关掉」。
   */
  return (
    <>
      <Modal
        centered
        classNames={{
          body: styles.body,
          content: cx(styles.content, fullscreen && styles.contentFullscreen),
          header: styles.header,
          title: styles.title,
        }}
        closeButtonProps={{ 'aria-label': '关闭预览' }}
        closeOnEscape={panel === null && anchorBlock.index === null}
        fullScreen={fullscreen}
        onClose={handleClose}
        opened={opened}
        overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
        padding={0}
        radius="md"
        size="min(980px, 92vw)"
        title={
          <TitleBar
            anchorBehavior={anchorLink.behavior}
            anchorScope={anchorScope.scope}
            canEdit={Boolean(onSave) && !loading}
            editing={editing}
            filter={filter}
            fontScale={proseFont}
            fullscreen={fullscreen}
            hasAnchorLinks={anchorBlocks.length > 0}
            loading={loading}
            onAnchorBehaviorChange={anchorLink.setBehavior}
            onAnchorScopeChange={anchorScope.setScope}
            onNext={withPanelsClosed(onNext)}
            onPanelChange={setPanel}
            onPrevious={withPanelsClosed(onPrevious)}
            onRefresh={
              onRefresh && !loading ? withPanelsClosed(refresh) : null
            }
            onStartEdit={startEditing}
            onToggleFullscreen={toggleFullscreen}
            panel={panel}
            position={position}
            refreshing={refreshing}
            relativePath={relativePath}
            title={title}
          />
        }
        transitionProps={{ duration: 140, transition: 'fade' }}
        trapFocus={anchorBlock.index === null}
        withCloseButton={!editing.editing}
      >
        {/* 正文工作区：左侧目录 + 右侧阅读 / 编辑区；筛选 / 渲染 / 目录定位都归它 */}
        <PreviewWorkspace
          Editor={Editor}
          editing={editing}
          filter={filter}
          fontOffset={proseFont.offset}
          fullscreen={fullscreen}
          loading={loading}
          markdown={renderedMarkdown}
          onBodyClick={anchorBlock.handleBodyClick}
          opened={opened}
          title={title}
        />
      </Modal>

      {/* 子区域预览：开在主预览上面，只看一块内容；Esc 只关它，底下这一篇留着 */}
      <AnchorBlockPreview
        blocks={anchorBlocks}
        index={anchorBlock.index}
        onClose={anchorBlock.close}
        onIndexChange={anchorBlock.setIndex}
        scope={anchorScope.scope}
      />
    </>
  );
};

export default MarkdownPreviewModal;
