/**
 * Markdown 预览弹窗（公共组件）。
 *
 * 全站所有 Markdown 弹窗预览都用它，别处不再各自拼 Modal 与渲染器：文档排版、翻篇、
 * 左侧标题目录、header 那排图标操作（复制路径 / 筛选 / 字号 / 文档内交互 / 刷新 / 全屏 /
 * 删除）与编辑流程都在这里统一。组件只做组装：
 * - 弹窗外壳与键位 → `@/components/modals/FreeModal`
 * - header 两组操作 → `DocumentActions` / `HeaderActions`
 * - 正文工作区（目录 + 阅读 / 编辑区）→ `PreviewWorkspace`
 * - 正文里的链接与折叠块 → `hooks/useDocumentInteractions` + `SectionPreview`
 * - 字号 / 编辑态 / 刷新 / 删除 / header 快捷键 → 各自的 hook
 *
 * 同文档链接与折叠块都能「原地处理 / 弹窗预览」，偏好由 header 那个交互图标弹层切换并跨篇记住。
 * 编辑与保存流程归这一层；具体怎么编辑由调用方通过 `Editor` 插槽传入。
 */

import { useState } from 'react';
import { FocusTrap } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

import HeaderIconAction from '@/components/buttons/HeaderIconAction';
import FreeModal from '@/components/modals/FreeModal';
import { useModalFullscreen } from '@/components/modals/FreeModal/hooks/useModalFullscreen';

import type { MarkdownPreviewModalProps, PreviewPanel } from './types';
import DocumentActions from './DocumentActions';
import PreviewHeaderActions from './HeaderActions';
import PreviewOverlays from './PreviewOverlays';
import PreviewWorkspace from './PreviewWorkspace';
import { FULLSCREEN_STORAGE_KEY } from './constants';
import { useCloseRequest } from './hooks/useCloseRequest';
import { useNoteEditing } from './hooks/useNoteEditing';
import { usePreviewHeaderActions } from './hooks/usePreviewHeaderActions';
import { useProseFontScale } from './hooks/useProseFontScale';
import { useRefreshPreview } from './hooks/useRefreshPreview';
import { useRemoveRequest } from './hooks/useRemoveRequest';
import { useRemoveShortcut } from './hooks/useRemoveShortcut';
import { useDocumentInteractions } from './hooks/useDocumentInteractions';
import { withSideEffect } from './utils/with-side-effect';

export type {
  MarkdownFilterNavigation,
  MarkdownPreviewFilter,
} from './types/filter';

export type {
  AnchorLinkBehavior,
  DetailsBlockBehavior,
  InteractionControlProps,
  MarkdownAnchorBlock,
  MarkdownDetailBlock,
  MarkdownEditorHandle,
  MarkdownEditorProps,
  MarkdownPreviewModalProps,
  MarkdownPreviewRemove,
  MarkdownPreviewRemoveChoice,
  MarkdownPreviewSection,
  SectionPreviewProps,
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
   * 文档内交互方式用 `interaction`），由弹窗持有是为了换篇、刷新、进编辑、关弹窗时统一收起——
   * 面板说的永远是当前这一次阅读。
   */
  const [panel, setPanel] = useState<PreviewPanel | null>(null);

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

  /** 正文里的两类交互（链接 / 折叠块）：内容、偏好、两层子预览与正文点击都收在这个 hook 里 */
  const interactions = useDocumentInteractions({
    beforeOpen: () => setPanel(null),
    filter,
    filtering: !editing.editing,
    markdown: renderedMarkdown,
  });

  /** 翻篇 / 刷新 / 进编辑 / 关弹窗前先收起浮层：它们说的都是「当前这一篇」 */
  const closeOverlays = () => {
    setPanel(null);
    interactions.close();
  };

  const withPanelsClosed = (action: (() => void) | null | undefined) =>
    withSideEffect(closeOverlays, action);

  /** 删除快捷键（Delete / Backspace）：与点 header 那个垃圾桶同一条路，先弹确认、不直接删 */
  useRemoveShortcut({
    enabled:
      opened &&
      remove !== undefined &&
      !editing.editing &&
      !loading &&
      panel === null &&
      !interactions.subPreviewOpen &&
      !removal.confirming,
    // `request` 本身非空（enabled 已经要求传了 remove），`withPanelsClosed` 的联合返回在这里收窄回动作
    onRequest: () => withPanelsClosed(removal.request)?.(),
  });

  /** header 弹层快捷键（`a` / `s` / `c` / `r`）与筛选面板的命中导航，键位口径收在 hook 里 */
  const header = usePreviewHeaderActions({
    blocked: interactions.subPreviewOpen || removal.confirming,
    editing: editing.editing,
    hasFilter: Boolean(filter),
    loading,
    opened,
    panel,
    refresh: onRefresh ? (withPanelsClosed(refresh) ?? null) : null,
    relativePath,
    setPanel,
  });

  /** 进入编辑时清掉弹层与子区域预览：新的一轮不该还亮着上一轮的位置 */
  const startEditing = () => {
    closeOverlays();
    editing.startEditing();
  };

  /** 关闭请求包一层：先收掉弹层与子区域预览再走原流程（状态留着会在重开时自己冒出来） */
  const handleClose = () => {
    closeOverlays();
    requestClose();
  };

  /*
   * 编辑态（含草稿预览）关不掉：关闭按钮不渲染，Esc / 点遮罩只提示；唯一出口是返回箭头。
   * Esc 的归属：header 弹层 / 子区域预览开着时只收那一层（`closeOnEscape` 由它们把关）。
   */
  /** 编辑态（含草稿预览）收掉阅读类操作与全屏：这时要看的是块编辑器 */
  const documentActionsVisible = !editing.editing;

  return (
    <>
      <FreeModal
        closeButton={!editing.editing}
        closeLabel="关闭预览"
        closeOnEscape={panel === null && !interactions.subPreviewOpen && !removal.confirming}
        fullscreen={
          documentActionsVisible
            ? { active: fullscreen, onToggle: toggleFullscreen }
            : undefined
        }
        headerActions={
          documentActionsVisible ? (
            <DocumentActions
              anchorBehavior={interactions.anchorLink.behavior}
              anchorScope={interactions.anchorScope.scope}
              detailsBehavior={interactions.detailsBlock.behavior}
              detailsScope={interactions.detailsScope.scope}
              filter={filter}
              fontScale={proseFont}
              hasAnchorLinks={interactions.anchorBlocks.length > 0}
              hasDetailBlocks={interactions.detailBlocks.some((b) => b.isOriginal)}
              highlightNavigation={header.highlightNavigation}
              loading={loading}
              onAnchorBehaviorChange={interactions.anchorLink.setBehavior}
              onAnchorScopeChange={interactions.anchorScope.setScope}
              onDetailsBehaviorChange={interactions.detailsBlock.setBehavior}
              onDetailsScopeChange={interactions.detailsScope.setScope}
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
        shortcutsEnabled={!loading && !interactions.subPreviewOpen && !removal.confirming}
        title={title}
        trapFocus={!interactions.subPreviewOpen && !removal.confirming}
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
          onBodyClick={interactions.handleBodyClick}
          onHighlightNavigation={header.setHighlightNavigation}
          opened={opened}
          title={title}
        />
      </FreeModal>

      <PreviewOverlays
        anchorBlock={interactions.anchorBlock}
        anchorBlocks={interactions.anchorBlocks}
        anchorScope={interactions.anchorScope.scope}
        detailBlock={interactions.detailBlock}
        detailBlocks={interactions.detailBlocks}
        detailsScope={interactions.detailsScope.scope}
        removal={removal}
        remove={remove}
        title={title}
      />
    </>
  );
};

export default MarkdownPreviewModal;
