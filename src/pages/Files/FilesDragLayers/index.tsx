import { useEffect, useRef } from 'react';
import { Portal } from '@mantine/core';

import DragGhost from '../DragGhost';
import DragTiles from '../DragTiles';
import PendingFlightLayer from '../PendingFly';
import PendingTray from '../PendingTray';

import type { FilesDragLayersProps } from './types';

import styles from './index.scss';

/**
 * 拖拽的三层浮层：待拖拽区 + 跟着指针走的拖拽影像 + 点选加入时的飞入动画，
 * 外加它们与移动会话的收尾联动。
 *
 * 为什么单独一层：待拖拽区全屏时就地占内容区左侧一列（`inline`），所以这一层挂在页面内容区
 * 那一行里、排在列表**之前**；影像与飞行动画不占位置，但**必须走 portal 挂到文档级**——
 * 全屏时页面根是 `position: fixed; z-index: 150` 的层叠上下文，留在这里的浮层不管自己写多高的
 * `z-index` 都被关在 150 这一层里，会被移动弹窗的遮罩（`z-index: 200`）整片盖住。
 *
 * 拖拽影像有三个来源：移动会话（弹窗开着，条目在手里）、「从列表往待拖拽区拖」那一程
 * （`pending.trayDrag`，不开弹窗，松手落在板上就收进来），以及直接拖模式下自己那批
 * （`dragEntries`——那一刻没有会话，也只能由页面递进来）。
 *
 * 收尾只摘掉这次**真正移成功**的条目（`movedPaths`）：关窗、Esc 取消时攒下的那些要留着。
 * 移动弹窗或预览弹窗开着时待拖拽区只藏不卸：前者是因为正在拖的条目就握在这条里，卸载等于取消
 * 整次拖拽；后者是因为它的 `z-index` 比预览弹窗高，露出来会压在画面上。
 */
const FilesDragLayers = ({
  dragAllDisabled,
  dragEntries,
  dragImage,
  entryActions,
  inline,
  onDragAll,
  onDropPaths,
  onSelectAll,
  onTrayDragEnd,
  pending,
  previewOpen,
}: FilesDragLayersProps) => {
  const { dragActive, movedPaths, session } = entryActions.dragMove;

  /** 会话开过一次就置位：关掉时才收尾（刚攒条目时不应该被动过） */
  const wasOpen = useRef(false);

  useEffect(() => {
    if (session !== null) {
      wasOpen.current = true;

      return;
    }

    if (!wasOpen.current) {
      return;
    }

    wasOpen.current = false;

    // 只摘掉这次真正移成功的：点 Esc 取消、或在弹窗里关掉，攒着的条目要留着
    if (movedPaths.length > 0) {
      pending.removePaths(movedPaths);
    }
  }, [movedPaths, pending, session]);

  /** 手上的那一批：正在拖的移动会话优先，其次「正往待拖拽区拖」的那一程 */
  const ghostEntries =
    dragEntries ?? (dragActive ? session?.entries : pending.trayDrag) ?? null;

  return (
    <div className={styles.layers}>
      {/* 常挂着：没有条目时只收起（`.closed` 走过渡），清空 / 取消才有「滑走」的退场动画 */}
      <PendingTray
        armed={pending.trayDrag !== null}
        closed={!pending.active}
        dragAllDisabled={dragAllDisabled}
        entries={pending.entries}
        hidden={session !== null || previewOpen}
        inline={inline}
        onClear={pending.clear}
        onDragAll={onDragAll}
        onDragEnd={onTrayDragEnd}
        onDropPaths={onDropPaths}
        onRemove={pending.remove}
        onSelectAll={onSelectAll}
        placeholderPath={pending.flight?.entry.path ?? null}
      />

      {/* 影像是「压在一切之上」的那一层：portal 到文档级，才盖得住全屏里的弹窗遮罩 */}
      <Portal>
        {/* 直接拖模式拎的是整条瓦片；其它两程仍是一叠小图标 */}
        {dragEntries === null || dragImage === null ? null : (
          <DragTiles image={dragImage} many={dragEntries.length > 1 ? dragEntries.length : null} />
        )}
        {dragEntries === null && ghostEntries !== null ? (
          <DragGhost entries={ghostEntries} showCount={pending.trayDrag === null} />
        ) : null}

        {/* 飞行动画同理：全屏时它也在弹窗之上（收进待拖拽区的那一下正当着弹窗） */}
        {pending.flight === null ? null : (
          <PendingFlightLayer flight={pending.flight} onDone={pending.clearFlight} />
        )}
      </Portal>
    </div>
  );
};

export default FilesDragLayers;
