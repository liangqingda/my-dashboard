import { useEffect, useRef } from 'react';

import DragGhost from '../DragGhost';
import DragTiles from '../DragTiles';
import PendingFlightLayer from '../PendingFly';
import PendingTray from '../PendingTray';

import type { FilesDragLayersProps } from './types';

import styles from './index.scss';

/**
 * 拖拽的三层浮层：覆盖侧栏的待拖拽区 + 跟着指针走的拖拽影像 + 点选加入时的飞入动画，
 * 外加它们与移动会话的收尾联动。
 *
 * 为什么单独一层：它们都是 `position: fixed` 的浮层，跟列表的布局无关，
 * 挂在页面最外层（弹窗之上都由这一层统一处理），页面只负责把状态递进来。
 *
 * 拖拽影像有三个来源：移动会话（弹窗开着，条目在手里）、「从列表往待拖拽区拖」那一程
 * （`pending.trayDrag`，不开弹窗，松手落在板上就收进来），以及直接拖模式下自己那批
 * （`dragEntries`——那一刻没有会话，也只能由页面递进来）。
 *
 * 收尾只摘掉这次**真正移成功**的条目（`movedPaths`）：关窗、Esc 取消时攒下的那些要留着。
 * 弹窗开着时待拖拽区只藏不卸：正在拖的条目就握在这条里，卸载等于取消整次拖拽。
 */
const FilesDragLayers = ({
  dragAllDisabled,
  dragEntries,
  dragImage,
  entryActions,
  onDragAll,
  onDropPaths,
  onSelectAll,
  onTrayDragEnd,
  pending,
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
        hidden={session !== null}
        onClear={pending.clear}
        onDragAll={onDragAll}
        onDragEnd={onTrayDragEnd}
        onDropPaths={onDropPaths}
        onRemove={pending.remove}
        onSelectAll={onSelectAll}
        placeholderPath={pending.flight?.entry.path ?? null}
      />

      {/* 直接拖模式拎的是整条瓦片；其它两程仍是一叠小图标 */}
      {dragEntries === null || dragImage === null ? null : (
        <DragTiles image={dragImage} many={dragEntries.length > 1 ? dragEntries.length : null} />
      )}
      {dragEntries === null && ghostEntries !== null ? (
        <DragGhost entries={ghostEntries} showCount={pending.trayDrag === null} />
      ) : null}

      {pending.flight === null ? null : (
        <PendingFlightLayer flight={pending.flight} onDone={pending.clearFlight} />
      )}
    </div>
  );
};

export default FilesDragLayers;
