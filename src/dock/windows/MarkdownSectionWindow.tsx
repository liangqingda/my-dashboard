/**
 * 程序坞里的 Markdown 子区块预览窗。
 *
 * 快照只留区块定位：后备路径先用 `useDockMarkdownNote` 按笔记名取回整篇，
 * 再用与页面同一套纯解析函数切出这一段、重算前后切换范围。正文与动作不进快照，
 * 页面卸载、刷新之后照样能定位回同一段。
 */

import { useEffect, useMemo, useState } from 'react';

import SectionPreview from '@/components/modals/MarkdownPreviewModal/SectionPreview';
import {
  ANCHOR_NAV_SCOPES,
  DEFAULT_ANCHOR_NAV_SCOPE,
  DEFAULT_DETAILS_NAV_SCOPE,
  DETAILS_NAV_SCOPES,
} from '@/components/modals/MarkdownPreviewModal/constants';
import type {
  AnchorNavScope,
  DetailsNavScope,
  MarkdownPreviewSection,
} from '@/components/modals/MarkdownPreviewModal/types';
import {
  collectAnchorBlocks,
  listAnchorBlockPeers,
} from '@/components/modals/MarkdownPreviewModal/utils/anchor-blocks';
import {
  collectDetailBlocks,
  listDetailBlockPeers,
} from '@/components/modals/MarkdownPreviewModal/utils/details-blocks';
import type { FreeModalDock } from '@/components/modals/FreeModal/types';

import type { DockWindowProps } from '../types';

import { useDockMarkdownNote } from './hooks/useDockMarkdownNote';

/** 解析后能交给子预览的一段：区块列表、当前下标与可切换范围 */
type ResolvedSection = {
  sections: MarkdownPreviewSection[];
  index: number;
  peers: readonly number[];
};

/** 快照口径落回枚举：存储值被改坏时按各入口默认口径 */
const resolveAnchorScope = (scope: string): AnchorNavScope =>
  ANCHOR_NAV_SCOPES.includes(scope as AnchorNavScope)
    ? (scope as AnchorNavScope)
    : DEFAULT_ANCHOR_NAV_SCOPE;

const resolveDetailsScope = (scope: string): DetailsNavScope =>
  DETAILS_NAV_SCOPES.includes(scope as DetailsNavScope)
    ? (scope as DetailsNavScope)
    : DEFAULT_DETAILS_NAV_SCOPE;

const MarkdownSectionWindow = ({ entry, onRequestClose, onWindowReady }: DockWindowProps) => {
  if (entry.kind !== 'markdown-section') {
    return null;
  }

  return (
    <MarkdownSectionWindowBody
      entry={entry}
      onRequestClose={onRequestClose}
      onWindowReady={onWindowReady}
    />
  );
};

type BodyProps = {
  entry: Extract<DockWindowProps['entry'], { kind: 'markdown-section' }>;
  onRequestClose: () => void;
  onWindowReady?: (ready: boolean) => void;
};

const MarkdownSectionWindowBody = ({
  entry,
  onRequestClose,
  onWindowReady,
}: BodyProps) => {
  const { snapshot } = entry;
  const note = useDockMarkdownNote({ title: snapshot.noteTitle });
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);

  const resolved = useMemo<ResolvedSection | null>(() => {
    const markdown = note.content ?? '';

    if (snapshot.variant === 'anchor') {
      const blocks = collectAnchorBlocks(markdown);
      const found = blocks.findIndex((block) => block.anchor === snapshot.blockKey);

      if (found < 0) {
        return null;
      }

      return {
        sections: blocks,
        index: found,
        peers: listAnchorBlockPeers(
          blocks,
          snapshot.blockKey,
          resolveAnchorScope(snapshot.scope),
        ),
      };
    }

    const blocks = collectDetailBlocks(markdown);
    const found = blocks.findIndex((block) => block.key === snapshot.blockKey);

    if (found < 0) {
      return null;
    }

    return {
      sections: blocks,
      index: found,
      peers: listDetailBlockPeers(blocks, found, resolveDetailsScope(snapshot.scope)),
    };
  }, [note.content, snapshot.variant, snapshot.blockKey, snapshot.scope]);

  const resolvedIndex = resolved?.index ?? null;
  /** 用户在可切换列表里挑中的下标；解析结果变了但挑中的段还在就沿用，否则回到当前段 */
  const index =
    pickedIndex !== null &&
    resolved !== null &&
    pickedIndex >= 0 &&
    pickedIndex < resolved.sections.length
      ? pickedIndex
      : resolvedIndex;

  /** 正文取到却定位不到这一段（笔记被删 / 区块被改掉）：不留一扇空窗，收回程序坞 */
  useEffect(() => {
    if (!note.loading && note.content !== null && resolved === null) {
      onRequestClose();
    }
  }, [note.loading, note.content, resolved, onRequestClose]);

  const dock: FreeModalDock = {
    id: entry.id,
    surfaceId: entry.id,
    kind: 'markdown-section',
    origin: 'dock',
    snapshot: entry.snapshot,
    title: entry.title,
  };

  return (
    <SectionPreview
      dock={dock}
      dockId={entry.id}
      dockOrigin="dock"
      index={index}
      onClose={onRequestClose}
      onIndexChange={setPickedIndex}
      onWindowReady={onWindowReady}
      peers={resolved?.peers ?? []}
      sections={resolved?.sections ?? []}
      storageScope={snapshot.storageScope}
      variant={snapshot.variant}
    />
  );
};

export default MarkdownSectionWindow;
