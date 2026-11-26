/**
 * 标题目录 sidebar 的可拖拽宽度：拖右边缘改宽度，拖到接近左边就收起；点一下边缘在
 * 展开 / 收起之间对切。
 *
 * 收起不是「删掉这一列」：右边缘留一条贴住正文的窄轨，点它（或往右拖）能还原
 * 上次的宽度。宽度与收起状态和全屏一样记在 localStorage 的偏好对象里（命名空间由调用方给，
 * 主预览与两种子预览各一份），换篇 / 重开 / 刷新都保持。
 * 拖动过程只改本地状态，松手才写存储——逐帧写 localStorage 是同步 I/O，拖动会卡。
 *
 * 窄屏（≤720px）目录是一条横带，拖动条由 CSS 隐藏、收起偏好也不生效，这里不额外判断。
 */

import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, RefObject } from 'react';

import { useStoredField } from '@/hooks/useStoredField';
import type { StoredFieldCodec } from '@/utils/local-storage';

import type { OutlineWidthPreference } from '../../types';
import {
  DEFAULT_OUTLINE_WIDTH_PREFERENCE,
  OUTLINE_COLLAPSE_WIDTH,
  OUTLINE_KEYBOARD_STEP,
  OUTLINE_MAX_RATIO,
  OUTLINE_MAX_WIDTH,
  OUTLINE_MIN_WIDTH,
  OUTLINE_WIDTH_FIELD,
} from '../constants';

/** 一次拖拽的起点：指针位移都相对它换算，松手时才落存储 */
type DragOrigin = {
  /** 认领这次拖拽的指针 id：多指触摸时只跟第一根手指 */
  pointerId: number;
  /** 按下时的指针横坐标 */
  startX: number;
  /** 按下时的列宽 */
  startWidth: number;
  /** 这次拖拽允许的最大宽度（按下时按工作区宽度算好） */
  maxWidth: number;
  /** 这次按下后是否真的拖动过：没动就是「点了窄轨一下」 */
  moved: boolean;
};

/** 指针位移小于这一档算「点」不算「拖」，免得点窄轨时手抖变成拖拽 */
const CLICK_SLOP = 4;

/**
 * 宽度偏好的编解码：读回来时校验类型并夹回允许区间，
 * 存储被手工改坏或塞进离谱数值时回落默认，不让脏值决定布局。
 */
const OUTLINE_WIDTH_CODEC: StoredFieldCodec<OutlineWidthPreference> = {
  decode: (value) => {
    if (typeof value !== 'object' || value === null) {
      return DEFAULT_OUTLINE_WIDTH_PREFERENCE;
    }

    const { collapsed, width } = value as {
      collapsed?: unknown;
      width?: unknown;
    };
    const storedWidth =
      typeof width === 'number' && Number.isFinite(width)
        ? Math.min(
            Math.max(Math.round(width), OUTLINE_MIN_WIDTH),
            OUTLINE_MAX_WIDTH,
          )
        : null;

    return { width: storedWidth, collapsed: collapsed === true };
  },
  encode: (preference) => preference,
};

/**
 * 按工作区可用宽度算上限：固定上限之外再按比例封顶，屏幕窄时目录不吃掉正文。
 *
 * @param available 目录所在工作区的宽度（px）
 */
const clampMaxWidth = (available: number): number => {
  const byRatio =
    available > 0
      ? Math.round(available * OUTLINE_MAX_RATIO)
      : OUTLINE_MAX_WIDTH;

  return Math.max(OUTLINE_MIN_WIDTH, Math.min(OUTLINE_MAX_WIDTH, byRatio));
};

/**
 * 管理目录宽度与收起状态。
 *
 * @param navRef 目录列的 ref，用来量当前宽度与工作区宽度
 * @param storageKey 这层预览的偏好命名空间（主预览与两种子预览各记各的宽度）
 * @returns 生效宽度（`null` 表示用 CSS 默认）、是否收起，以及拖动条的事件属性
 */
export const useOutlineWidth = (
  navRef: RefObject<HTMLDivElement | null>,
  storageKey: string,
) => {
  const [preference, setPreference] = useStoredField<OutlineWidthPreference>(
    storageKey,
    OUTLINE_WIDTH_FIELD,
    OUTLINE_WIDTH_CODEC,
  );
  /** 拖动中的临时宽度：松手才落存储，避免逐帧写盘 */
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  /** 是否正在拖拽：拖拽期间关掉宽度过渡，列宽直接跟指针实时走 */
  const [dragging, setDragging] = useState(false);
  const dragWidthRef = useRef<number | null>(null);
  const originRef = useRef<DragOrigin | null>(null);

  /** 生效宽度：拖动中跟着指针、平时用存下来的偏好，`null` 时交给 CSS 默认值 */
  const width = dragWidth ?? preference.width;
  /** 拖动过程中就已经按「会收起」显示，松手只是把这个结果存下来 */
  const collapsed =
    dragWidth === null
      ? preference.collapsed
      : dragWidth < OUTLINE_COLLAPSE_WIDTH;

  const availableWidth = useCallback(
    () => navRef.current?.parentElement?.clientWidth ?? 0,
    [navRef],
  );

  const updateDrag = (next: number | null) => {
    dragWidthRef.current = next;
    setDragWidth(next);
  };

  /** 把一次宽度变更落成偏好；落到收起档时保留原来的展开宽度，供窄轨还原 */
  const commitWidth = useCallback(
    (next: number) => {
      if (next < OUTLINE_COLLAPSE_WIDTH) {
        setPreference({ width: preference.width, collapsed: true });

        return;
      }

      setPreference({ width: next, collapsed: false });
    },
    [preference.width, setPreference],
  );

  /**
   * 点一下边缘（没拖动）：展开态收起、收起态还原，两者对切。
   * 收起时量一次当前列宽存下来，还原时回到这个宽度，而不是退回默认档。
   */
  const toggleCollapsed = useCallback(() => {
    if (preference.collapsed) {
      setPreference({ width: preference.width, collapsed: false });

      return;
    }

    const current = Math.round(
      navRef.current?.getBoundingClientRect().width ?? 0,
    );
    const restored = current >= OUTLINE_MIN_WIDTH ? current : preference.width;

    setPreference({ width: restored, collapsed: true });
  }, [navRef, preference, setPreference]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const nav = navRef.current;

    if (!nav) {
      return;
    }

    originRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: Math.round(nav.getBoundingClientRect().width),
      maxWidth: clampMaxWidth(availableWidth()),
      moved: false,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    updateDrag(originRef.current.startWidth);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const origin = originRef.current;

    if (!origin || origin.pointerId !== event.pointerId) {
      return;
    }

    const offset = event.clientX - origin.startX;

    if (Math.abs(offset) >= CLICK_SLOP) {
      origin.moved = true;
    }

    updateDrag(
      Math.round(
        Math.min(Math.max(origin.startWidth + offset, 0), origin.maxWidth),
      ),
    );
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const origin = originRef.current;

    if (!origin || origin.pointerId !== event.pointerId) {
      return;
    }

    originRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const next = dragWidthRef.current;

    updateDrag(null);
    setDragging(false);

    if (next === null) {
      return;
    }

    /* 没拖动就是点了一下边缘：展开 / 收起对切，不走拖拽落宽 */
    if (!origin.moved) {
      toggleCollapsed();

      return;
    }

    commitWidth(next);
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const current = Math.round(
        navRef.current?.getBoundingClientRect().width ?? 0,
      );

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        commitWidth(current - OUTLINE_KEYBOARD_STEP);

        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();

        /* 收起时从上次的宽度接着往右长，而不是从 0 一格格挪 */
        const base = preference.collapsed
          ? (preference.width ?? OUTLINE_MIN_WIDTH)
          : current;

        setPreference({
          width: Math.min(
            base + OUTLINE_KEYBOARD_STEP,
            clampMaxWidth(availableWidth()),
          ),
          collapsed: false,
        });

        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleCollapsed();
      }
    },
    [availableWidth, commitWidth, navRef, preference, setPreference, toggleCollapsed],
  );

  return {
    /** 生效宽度；`null` 时目录用 CSS 默认宽度 */
    width,
    /** 是否收起（只留右边缘那条窄轨） */
    collapsed,
    /** 是否正在拖拽：期间关掉宽度过渡，列宽跟指针实时走 */
    dragging,
    /** 拖动条（收起时承担「展开窄轨」）的事件属性 */
    handleProps: {
      onKeyDown: handleKeyDown,
      onPointerCancel: handlePointerUp,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
  };
};
