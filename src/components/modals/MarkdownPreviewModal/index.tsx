/**
 * Markdown 预览弹窗（公共组件）。
 *
 * 全站所有 Markdown 弹窗预览都必须使用这个组件，不要各自拼装 Modal 与渲染器：
 * 它统一了文档排版、上一篇 / 下一篇导航（header 标题左侧按钮 + `[` / `]` 与 ← / → 快捷键）、
 * 弹窗左侧固定的标题目录 sidebar（文档内 h1–h4 目录，随弹窗高度拉伸、目录自身滚动，
 * 滚动正文时跟随高亮当前小节）、header 右侧的一排操作：复制文档的相对路径（调用方给路径）、
 * 筛选正文（口径由调用方给）、正文字号（跨篇记住的阅读偏好）、同文档锚点链接的打开方式、
 * 全屏预览（把整个框体铺满视口放大阅读空间，再点一次切回常规）、
 * 删除这篇文档（调用方给二次确认说明与删除动作，点一下先问一遍；
 * 预览态按 Delete / Backspace 同样唤出这一层确认，不会一按就删）
 * 与编辑 / 预览 / 保存 / 放弃改动，全部只留图标 + tooltip。
 * 组件只负责编辑态与保存流程，不知道文档结构和文件落在哪里：
 * 具体怎么编辑由调用方通过 `Editor` 插槽传入，没有定制编辑器时给出定制提示。
 *
 * 同文档锚点链接（`[文字](#锚点)`）有两种行为，由 header 上那个图标按钮决定并跨篇记住：
 * - `jump`：在当前正文里滚到锚点（默认，等于浏览器原行为）；
 * - `modal`：把锚点指向的那一节（到下一个同级或更高级标题为止）单独开窗，
 *   header 左侧按正文顺序前后切换、右侧只有字号 / 全屏 / 关闭。
 *
 * 这里的职责只有组装：
 * - 弹窗外壳（框体 / header / 正文区 / 全屏 / 翻篇计数）→ `@/components/modals/FreeModal`（本组件不再自带 Modal）
 * - header 第一组阅读类操作 → `document-actions`
 * - header 第二组编辑流程 → `HeaderActions`
 * - 正文工作区（标题目录 + 阅读 / 编辑区）→ `preview-workspace`
 * - 锚点区块的开合与链接点击 → `hooks/use-anchor-block-navigation` + `anchor-block-preview`
 * - 正文字号的状态 → `hooks/use-prose-font-scale`
 * - header 右侧的操作与状态提示 → `header-actions`
 * - 编辑态状态机 → `hooks/use-note-editing`
 * - 翻篇快捷键与按钮焦点 → `hooks/use-step-navigation`
 */

import { useCallback, useMemo, useState } from 'react';
import { FocusTrap } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';

import { COPY_FAILED_NOTICE_ID } from '@/components/buttons/CopyIconButton/constants';
import FreeModal from '@/components/modals/FreeModal';
import { useModalFullscreen } from '@/components/modals/FreeModal/hooks/useModalFullscreen';
import { COPY_FEEDBACK_DURATION, copyText } from '@/utils/clipboard';

import type { MarkdownFilterNavigation } from './types/filter';
import type { MarkdownPreviewModalProps, PreviewPanel } from './types';
import DocumentActions from './DocumentActions';
import HeaderIconAction from './HeaderActions/IconAction';
import PreviewHeaderActions from './HeaderActions';
import PreviewOverlays from './PreviewOverlays';
import PreviewWorkspace from './PreviewWorkspace';
import { COPY_SUCCESS_NOTICE_ID, FULLSCREEN_STORAGE_KEY } from './constants';
import { useAnchorBlockNavigation } from './hooks/useAnchorBlockNavigation';
import { useAnchorLinkBehavior } from './hooks/useAnchorLinkBehavior';
import { useAnchorNavScope } from './hooks/useAnchorNavScope';
import { useCloseRequest } from './hooks/useCloseRequest';
import { useHeaderActionShortcuts } from './hooks/useHeaderActionShortcuts';
import { useNoteEditing } from './hooks/useNoteEditing';
import { useProseFontScale } from './hooks/useProseFontScale';
import { useRefreshPreview } from './hooks/useRefreshPreview';
import { useRemoveRequest } from './hooks/useRemoveRequest';
import { useRemoveShortcut } from './hooks/useRemoveShortcut';
import { collectAnchorBlocks } from './utils/anchor-blocks';
import { withSideEffect } from './utils/with-side-effect';

export type {
  MarkdownFilterNavigation,
  MarkdownPreviewFilter,
} from './types/filter';

export type {
  AnchorLinkBehavior,
  AnchorLinkControlProps,
  MarkdownAnchorBlock,
  MarkdownEditorHandle,
  MarkdownEditorProps,
  MarkdownPreviewModalProps,
  MarkdownPreviewRemove,
  MarkdownPreviewRemoveChoice,
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
  remove,
}: MarkdownPreviewModalProps) => {
  /**
   * header 上的就近弹层：同一时刻只开一块（筛选用 `filter`、字号用 `font`、
   * 同文档链接打开方式用 `anchor`），由弹窗持有是为了换篇、刷新、进编辑、关弹窗时统一收起——
   * 面板说的永远是当前这一次阅读。
   */
  const [panel, setPanel] = useState<PreviewPanel | null>(null);

  /** 正文关键词匹配导航：工作区打标后回传，header 筛选面板挂回车切换 */
  const [highlightNavigation, setHighlightNavigation] =
    useState<MarkdownFilterNavigation | null>(null);

  /** 全屏开关：记住的展示偏好，关闭弹窗也不重置；Esc 不归它管，永远是关弹窗 */
  const { fullscreen, toggle: toggleFullscreen } = useModalFullscreen(
    FULLSCREEN_STORAGE_KEY,
  );
  /** 正文字号的用户偏移：跨篇、跨会话记住，叠在常规 / 全屏各自的默认字号上 */
  const proseFont = useProseFontScale();
  /** 刷新按钮的 loading 与失败提示都在这个 hook 里 */
  const { refresh, refreshing } = useRefreshPreview(onRefresh);

  /**
   * 删除请求：点 header 的删除按钮先弹二次确认，确认后才真的删。
   * 确认层开着时 Esc 与焦点都归它（主弹窗这一层让开），删除失败只收确认层、正文留着。
   */
  const removal = useRemoveRequest({ remove });

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
   * 翻篇快捷键（`[` / `]`、← / →）与全屏（`F`）都由 `FreeModal` 统一接管，
   * 这里只负责在「子区域预览 / 确认层 / 加载中」时整组收掉。
   */
  /**
   * 删除快捷键：预览态按 Delete / Backspace 打开二次确认层，与点 header 那个垃圾桶走同一条路。
   *
   * 只在「真的能删」的时候响应：有删除能力、非编辑态、正文已就位，
   * 且 header 弹层、子区域预览、确认层都没开着——那些层开着时键盘属于它们。
   */
  useRemoveShortcut({
    enabled:
      opened &&
      remove !== undefined &&
      !editing.editing &&
      !loading &&
      panel === null &&
      anchorBlock.index === null &&
      !removal.confirming,
    // `request` 本身非空（enabled 已经要求传了 remove），`withPanelsClosed` 的联合返回在这里收窄回动作
    onRequest: () => withPanelsClosed(removal.request)?.(),
  });

  /**
   * 快捷键复制相对路径：成败都走固定通知 id，连按不叠一屏；成功反馈档位与按钮对勾同长。
   * 按钮上的对勾状态复制组件内部持有，快捷键路径看不到，只能用通知给反馈。
   */
  const handleCopyPath = useCallback(() => {
    if (!relativePath) {
      return;
    }

    void copyText(relativePath).then((ok) => {
      notifications.show({
        id: ok ? COPY_SUCCESS_NOTICE_ID : COPY_FAILED_NOTICE_ID,
        color: ok ? 'teal' : 'red',
        title: ok ? '已复制' : '复制失败',
        message: ok ? '相对路径已复制' : '复制失败，请手动复制',
        autoClose: ok ? COPY_FEEDBACK_DURATION : false,
      });
    });
  }, [relativePath]);

  /** 快捷键开合筛选面板：已开筛选就收起，否则切到筛选（与点筛选按钮同一条路） */
  const toggleFilterPanel = useCallback(() => {
    setPanel((current) => (current === 'filter' ? null : 'filter'));
  }, []);

  /** 快捷键开合字号面板：已开字号面板就收起，否则切到字号（与点字号按钮同一条路） */
  const toggleFontPanel = useCallback(() => {
    setPanel((current) => (current === 'font' ? null : 'font'));
  }, []);

  /**
   * header 操作快捷键：`a` 字号开合、`s` 筛选开合、`c` 复制路径、`r` 刷新
   * （翻篇与 `F` 全屏在 `FreeModal` 里统一处理）。
   * 子区域预览 / 删除确认层开着时停用——那时键盘归上面那一层；编辑态整组按钮都收掉。
   */
  useHeaderActionShortcuts({
    enabled:
      opened &&
      !editing.editing &&
      anchorBlock.index === null &&
      !removal.confirming,
    onToggleFont: !loading ? toggleFontPanel : null,
    onToggleFilter: filter && !loading ? toggleFilterPanel : null,
    onCopy: relativePath ? handleCopyPath : null,
    onRefresh: onRefresh ? refresh : null,
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
  /** 编辑态（含草稿预览）收掉阅读类操作与全屏：这时要看的是块编辑器 */
  const documentActionsVisible = !editing.editing;

  return (
    <>
      <FreeModal
        closeButton={!editing.editing}
        closeLabel="关闭预览"
        closeOnEscape={
          panel === null && anchorBlock.index === null && !removal.confirming
        }
        fullscreen={
          documentActionsVisible
            ? { active: fullscreen, onToggle: toggleFullscreen }
            : undefined
        }
        headerActions={
          documentActionsVisible ? (
            <DocumentActions
              anchorBehavior={anchorLink.behavior}
              anchorScope={anchorScope.scope}
              filter={filter}
              fontScale={proseFont}
              hasAnchorLinks={anchorBlocks.length > 0}
              highlightNavigation={highlightNavigation}
              loading={loading}
              onAnchorBehaviorChange={anchorLink.setBehavior}
              onAnchorScopeChange={anchorScope.setScope}
              onPanelChange={setPanel}
              onRefresh={onRefresh ? (withPanelsClosed(refresh) ?? null) : null}
              panel={panel}
              refreshing={refreshing}
              relativePath={relativePath}
            />
          ) : undefined
        }
        headerSecondary={
          <PreviewHeaderActions
            askDiscard={editing.askDiscard}
            canEdit={Boolean(onSave) && !loading}
            editing={editing.editing}
            onCancelEdit={editing.requestExitEditing}
            onDiscard={editing.discardAndExitEditing}
            onKeepEditing={editing.keepEditing}
            onSaveEdit={editing.save}
            onStartEdit={startEditing}
            onStartPreview={editing.startPreview}
            onStopPreview={editing.stopPreview}
            previewing={editing.previewing}
            saveError={editing.saveError}
            saveNotice={editing.saveNotice}
            savedAt={editing.savedAt}
            saving={editing.saving}
          />
        }
        headerTail={
          documentActionsVisible && remove && !loading ? (
            <HeaderIconAction
              label="删除这篇文档（Delete）"
              onClick={withPanelsClosed(removal.request) ?? undefined}
            >
              <IconTrash size={15} stroke={1.9} />
            </HeaderIconAction>
          ) : undefined
        }
        nav={
          position
            ? {
                disabled: editing.editing,
                index: position.index,
                nextLabel: '下一篇',
                onNext: withPanelsClosed(onNext) ?? null,
                onPrevious: withPanelsClosed(onPrevious) ?? null,
                previousLabel: '上一篇',
                shortcutHint: '[ / ← · ] / →',
                total: position.total,
              }
            : undefined
        }
        onClose={handleClose}
        opened={opened}
        shortcutsEnabled={
          !loading && anchorBlock.index === null && !removal.confirming
        }
        title={title}
        trapFocus={anchorBlock.index === null && !removal.confirming}
      >
        <FocusTrap.InitialFocus />
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
          onHighlightNavigation={setHighlightNavigation}
          opened={opened}
          title={title}
        />
      </FreeModal>

      <PreviewOverlays
        anchorBlock={anchorBlock}
        anchorBlocks={anchorBlocks}
        anchorScope={anchorScope.scope}
        removal={removal}
        remove={remove}
        title={title}
      />
    </>
  );
};

export default MarkdownPreviewModal;
