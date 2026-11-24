import { useEffect, useRef } from 'react';

import DragGhost from '../DragGhost';
import PendingFlyLayer from '../PendingFly';
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
 * 收尾只摘掉这次**真正移成功**的条目（`movedPaths`）：关窗、Esc 取消时攒下的那些要留着。
 * 弹窗开着时待拖拽区只藏不卸：正在拖的条目就握在这条里，卸载等于取消整次拖拽。
 */
const FilesDragLayers = ({ entryActions, pending }: FilesDragLayersProps) => {
  const { dragActive, endDrag, movedPaths, session } = entryActions.dragMove;
  /** 起拖入口在条目动作编排上（它同时管拖拽源高亮），不在移动会话里 */
  const { dragStartEntries } = entryActions;
  /** 会话开过一次就置位：关掉时才清空待拖拽区（刚攒条目时不应该被清） */
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

  return (
    <div className={styles.layers}>
      {pending.active ? (
        <PendingTray
          entries={pending.entries}
          hidden={session !== null}
          onClear={pending.clear}
          onDragAll={() => dragStartEntries(pending.entries)}
          onDragEnd={endDrag}
          onDragEntry={(entry) => dragStartEntries([entry])}
          onRemove={pending.remove}
        />
      ) : null}

      {dragActive ? <DragGhost entries={session?.entries ?? pending.entries} /> : null}

      {pending.fly === null ? null : (
        <PendingFlyLayer fly={pending.fly} onDone={pending.clearFly} />
      )}
    </div>
  );
};

export default FilesDragLayers;
