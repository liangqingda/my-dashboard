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
 * 同文档锚点与折叠块都能「原地处理 / 弹窗预览」，偏好由 header 那个交互图标弹层切换并跨篇记住。
 * 编辑与保存流程归这一层；具体怎么编辑由调用方通过 `Editor` 插槽传入。
 */

import { useState } from 'react';
import { IconTrash } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeModal from '@/components/modals/FreeModal';
import type { FreeModalDock } from '@/components/modals/FreeModal/types';
import { useModalFullscreen } from '@/components/modals/FreeModal/hooks/useModalFullscreen';

import type { MarkdownPreviewModalProps, PreviewPanel } from './types';
import DocumentActions from './DocumentActions';
import PreviewHeaderActions from './HeaderActions';
import PreviewOverlays from './PreviewOverlays';
import PreviewWorkspace from './PreviewWorkspace';
import { mainPreviewStorageKey } from './constants';
import { useReportPreviewReady } from './hooks/useReportPreviewReady';
import { useCloseRequest } from './hooks/useCloseRequest';
import { useDocumentInteractions } from './hooks/useDocumentInteractions';
import { useDockPreviewActions } from './hooks/useDockPreviewActions';
import { useNoteEditing } from './hooks/useNoteEditing';
import { usePreviewHeaderActions } from './hooks/usePreviewHeaderActions';
import { useProseFontScale } from './hooks/useProseFontScale';
import { useRefreshPreview } from './hooks/useRefreshPreview';
import { useRemoveRequest } from './hooks/useRemoveRequest';
import { withSideEffect } from './utils/with-side-effect';

import styles from './index.scss';

export type {
  MarkdownFilterNavigation,
  MarkdownPreviewFilter,
} from './types/filter';

export type * from './types';

const MarkdownPreviewModal = ({
  opened,
  title,
  markdown,
  loading = false,
  position,
  relativePath,
  filter,
  onClose,
  onMinimize,
  onPrevious,
  onNext,
  onRefresh,
  onSave,
  Editor,
  remove,
  storageScope,
  dockOrigin = 'page',
  dockId,
  onWindowReady,
}: MarkdownPreviewModalProps) => {
  /* header 就近弹层：同一时刻只开一块，换篇 / 刷新 / 进编辑 / 关窗时统一收起。 */
  const [panel, setPanel] = useState<PreviewPanel | null>(null);

  /** 这一页的偏好命名空间：同一个弹窗挂在不同页面时各记各的（页面标识由调用方给） */
  const storageKey = mainPreviewStorageKey(storageScope);

  /** 全屏开关：记住的展示偏好，关闭弹窗也不重置；Esc 不归它管，永远是关弹窗 */
  const { fullscreen: storedFullscreen, toggle: toggleFullscreen } =
    useModalFullscreen(storageKey);
  /** 页面弹窗与程序坞窗共用同一份全屏偏好：两边只差「收起到程序坞」那颗按钮 */
  const fullscreen = storedFullscreen;
  /** 正文字号的用户偏移：跨篇、跨会话记住，叠在常规 / 全屏各自的默认字号上 */
  const proseFont = useProseFontScale(storageKey);
  /** 刷新按钮的 loading 与失败提示都在这个 hook 里 */
  const { refresh, refreshing } = useRefreshPreview(onRefresh);

  /* 删除先二次确认；确认层开着时 Esc 与焦点归它，失败只收确认层、正文留着。 */
  const removal = useRemoveRequest({ remove });

  const editing = useNoteEditing({
    documentTitle: title,
    hasEditor: Boolean(Editor),
    markdown,
    onSave,
  });

  /** 正文就位上报：程序坞冷唤起的后备 / 页面窗，等骨架换成正文再报 true，宿主才启动开窗动画 */
  useReportPreviewReady({ onWindowReady, ready: !loading });

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
    storageKey,
  });

  /** 翻篇 / 刷新 / 进编辑 / 关弹窗前先收起浮层：它们说的都是「当前这一篇」 */
  const closeOverlays = () => {
    setPanel(null);
    interactions.close();
  };

  const withPanelsClosed = (action: (() => void) | null | undefined) =>
    withSideEffect(closeOverlays, action);

  /** header 弹层快捷键（`a` / `s` / `r`）与筛选面板的命中导航，键位口径收在 hook 里 */
  const header = usePreviewHeaderActions({
    blocked: interactions.subPreviewOpen || removal.confirming,
    editing: editing.editing,
    hasFilter: Boolean(filter),
    loading,
    opened,
    panel,
    refresh: onRefresh ? (withPanelsClosed(refresh) ?? null) : null,
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

  /* 编辑态关不掉：关闭按钮不渲染，Esc / 点遮罩只提示，唯一出口是返回箭头。 */
  /** 编辑态（含草稿预览）收掉阅读类操作与全屏入口（铺满外观保留，见 `fullscreen.showToggle`） */
  const documentActionsVisible = !editing.editing;

  /*
   * 程序坞描述：只收定位信息（标题 / 相对路径 / 页面标识），正文不进快照——
   * 恢复窗按笔记名从仓库重读，取不到时给一句「笔记已不在仓库里」。
   * 编辑 / 删除确认 / 未加载时不让收。
   */
  const dock: FreeModalDock | undefined = loading
    ? undefined
    : {
        disabled: editing.editing || removal.confirming,
        id: `markdown-preview:${storageScope}:${relativePath ?? title}`,
        kind: 'markdown-preview',
        origin: dockOrigin,
        snapshot: {
          storageScope,
          title,
          ...(relativePath === undefined ? {} : { relativePath }),
        },
        surfaceId: dockOrigin === 'dock' ? dockId : undefined,
        title,
      };

  useDockPreviewActions({
    Editor,
    filter,
    id: dockOrigin === 'page' ? dock?.id : undefined,
    loading,
    markdown,
    onClose: handleClose,
    onNext,
    onPrevious,
    onRefresh,
    onSave,
    position,
    relativePath,
    remove,
    storageScope,
    title,
  });

  return (
    <>
      <FreeModal
        beforeMinimize={fullscreen ? toggleFullscreen : undefined}
        closeButton={!editing.editing}
        closeLabel="关闭预览"
        closeOnEscape={panel === null && !interactions.subPreviewOpen && !removal.confirming}
        contentClassName={styles.glassChrome}
        copy={
          documentActionsVisible && relativePath
            ? { message: '相对路径已复制', text: relativePath }
            : undefined
        }
        dock={dock}
        fullscreen={{
          active: fullscreen,
          onToggle: toggleFullscreen,
          showToggle: documentActionsVisible,
        }}
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
        headerClassName={styles.glassHeader}
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
            <FreeIconAction
              label="删除这篇文档（Delete）"
              onClick={withPanelsClosed(removal.request) ?? undefined}
            >
              <IconTrash size={15} stroke={1.9} />
            </FreeIconAction>
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
        onMinimize={onMinimize}
        onRequestDelete={
          documentActionsVisible &&
          remove !== undefined &&
          !loading &&
          panel === null
            ? (withPanelsClosed(removal.request) ?? null)
            : null
        }
        opened={opened}
        shortcutsEnabled={!loading && !interactions.subPreviewOpen && !removal.confirming}
        surfaceId={dockOrigin === 'dock' ? dockId : undefined}
        title={title}
        trapFocus={!interactions.subPreviewOpen && !removal.confirming}
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
          onBodyClick={interactions.handleBodyClick}
          onHighlightNavigation={header.setHighlightNavigation}
          opened={opened}
          storageKey={storageKey}
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
        storageScope={storageScope}
        title={title}
      />
    </>
  );
};

export default MarkdownPreviewModal;
