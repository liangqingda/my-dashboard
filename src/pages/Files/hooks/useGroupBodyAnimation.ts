import { useCallback, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import type { EntryGroupKey } from '../types';

/**
 * 网格分组段的高度过渡：折叠态不持久化动画高度。
 *
 * 纯 `grid-template-rows: 1fr → 0fr` 在 auto 高度容器里收成 0 不可靠，这里按实测高度
 * 跑 `max-height` 过渡：收起先钉住当前高度再下一帧收成 0；展开先压到 0、提交状态后下一帧
 * 撑到内容高。动画结束再把内联高度交还自然高度。
 *
 * 表格视图不接这个 hook：分组行收起即卸载条目行，没有高度动画。
 */

/** 第二次写高度前等一帧布局；用定时器而不是 rAF：隐藏标签页里 rAF 会被挂起 */
const SECOND_FRAME_MS = 20;

type BodyHeightMap = Partial<Record<EntryGroupKey, number>>;

export const useGroupBodyAnimation = (
  collapsedGroups: ReadonlySet<EntryGroupKey>,
  onToggleGroup: (key: EntryGroupKey) => void,
) => {
  const bodyRefs = useRef(new Map<EntryGroupKey, HTMLDivElement>());
  const [bodyHeights, setBodyHeights] = useState<BodyHeightMap>({});
  /** 正在收起、等高度动画结束后再提交折叠状态的分组键 */
  const committingRef = useRef(new Set<EntryGroupKey>());
  /** 第二次写高度的定时器：重复点击 / 卸载时先取消，避免写过期末高度 */
  const timerRefs = useRef(new Map<EntryGroupKey, number>());

  const setHeight = useCallback((key: EntryGroupKey, height: number | undefined) => {
    setBodyHeights((prev) => {
      const next = { ...prev };

      if (height === undefined) {
        delete next[key];
      } else {
        next[key] = height;
      }

      return next;
    });
  }, []);

  const cancelTimer = useCallback((key: EntryGroupKey) => {
    const timer = timerRefs.current.get(key);

    if (timer !== undefined) {
      window.clearTimeout(timer);
      timerRefs.current.delete(key);
    }
  }, []);

  /** 先把起始高度布局出来，再写目标高度，高度才有过渡可跑 */
  const scheduleSecondHeight = useCallback(
    (key: EntryGroupKey, apply: () => void) => {
      cancelTimer(key);
      const timer = window.setTimeout(apply, SECOND_FRAME_MS);

      timerRefs.current.set(key, timer);
    },
    [cancelTimer],
  );

  const handleToggle = useCallback(
    (key: EntryGroupKey) => {
      const body = bodyRefs.current.get(key);
      const willCollapse = !collapsedGroups.has(key);

      if (!body) {
        onToggleGroup(key);
        return;
      }

      if (willCollapse) {
        committingRef.current.add(key);
        setHeight(key, body.scrollHeight);
        scheduleSecondHeight(key, () => setHeight(key, 0));
      } else {
        // 展开途中被再次点开：清掉待提交的收起流程，直接走展开
        committingRef.current.delete(key);
        cancelTimer(key);
        setHeight(key, 0);
        onToggleGroup(key);
        scheduleSecondHeight(key, () => {
          const next = bodyRefs.current.get(key);

          if (next) {
            setHeight(key, next.scrollHeight);
          }
        });
      }
    },
    [cancelTimer, collapsedGroups, onToggleGroup, scheduleSecondHeight, setHeight],
  );

  const handleBodyTransitionEnd = useCallback(
    (key: EntryGroupKey) => {
      if (committingRef.current.has(key)) {
        committingRef.current.delete(key);
        onToggleGroup(key);
        setHeight(key, undefined);
      } else {
        // 展开动画结束：内联高度交还自然高度
        setHeight(key, undefined);
      }
    },
    [onToggleGroup, setHeight],
  );

  const registerBody = useCallback(
    (key: EntryGroupKey) => (el: HTMLDivElement | null) => {
      if (el) {
        bodyRefs.current.set(key, el);
      } else {
        bodyRefs.current.delete(key);
      }
    },
    [],
  );

  const bodyStyle = useCallback(
    (key: EntryGroupKey): CSSProperties | undefined => {
      const maxHeight = bodyHeights[key];

      return maxHeight === undefined ? undefined : { maxHeight: `${maxHeight}px` };
    },
    [bodyHeights],
  );

  return {
    registerBody,
    bodyStyle,
    onToggleGroup: handleToggle,
    onBodyTransitionEnd: handleBodyTransitionEnd,
  };
};
