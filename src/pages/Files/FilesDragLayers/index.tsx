import { useEffect, useRef } from 'react';

import DragGhost from '../DragGhost';
import PendingTray from '../PendingTray';

import type { FilesDragLayersProps } from './types';

import styles from './index.scss';

/**
 * 拖拽的两层浮层：顶部悬浮的待拖拽区 + 跟着指针走的拖拽影像，外加两者的收尾联动。
 *
 * 为什么单独一层：它们都是 `position: fixed` 的浮层，跟列表的布局无关，
 * 挂在页面最外层（弹窗之上都由这一层统一处理），页面只负责把状态递进来。
 *
 * 收尾：移动会话结束（成功移入或关窗）就把待拖拽区清空——那一批条目已经各有去处。
 * 弹窗开着时待拖拽区只藏不卸：正在拖的条目就握在这条里，卸载等于取消整次拖拽。
 */
const FilesDragLayers = ({ entryActions, pending }: FilesDragLayersProps) => {
  const { dragActive, endDrag, session } = entryActions.dragMove;
  /** 起拖入口在条目动作编排上（它同时管拖拽源高亮），不在移动会话里 */
  const { dragStartEntries } = entryActions;
  /** 会话开过一次就置位：关掉时才清空待拖拽区（刚攒条目时不应该被清） */
  const wasOpen = useRef(false);

  useEffect(() => {
    if (session !== null) {
      wasOpen.current = true;

      return;
    }

    if (wasOpen.current) {
      wasOpen.current = false;
      pending.clear();
    }
  }, [pending, session]);

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
    </div>
  );
};

export default FilesDragLayers;
