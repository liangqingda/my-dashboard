/**
 * 省略文本：容器放不下才省略，且**只有被省略时**才在 hover / 键盘聚焦时用 tip 展示完整内容。
 * 文本本来就放得下时不弹任何提示，不给读者加噪音。
 *
 * 默认单行、中间省略：头部与尾部都保留，省略号落在**最后一行的水平中间**——单行时就是
 * 这一行的中间，两行时落在第二行中间，三行时落在第三行中间；`lines={2}` 时截到两行。
 *
 * 省略位置只看「这个位置的宽度会不会在静止状态下变」：宽度会变（可拖拽的列宽、hover 抢份额
 * 这类）传 `ellipsis="end"` 走尾部省略——end 档按当下宽度现量，宽度变了也自洽；middle 的拼法
 * 只在节点挂上、文案或行数变化时算一次，宽度事后变了不会自己重排。
 *
 * end 档的 tip 与测量都推迟到「被指到的那一刻」（见 `useHoverIntent`）：列表里几百个条目
 * 各自常驻一个 Tooltip 会白付几百套浮动定位实例的挂载成本，各自挂一个 ResizeObserver
 * 测量则会拆成几百次强制重排。middle 档做不到推迟——中间省略的拼法必须在节点挂上后、
 * 第一帧画出来之前定好，所以在回调 ref 里量一次（节点挂上即量），不挂常驻观察器；
 * 文案或行数变了再按 `useLayoutEffect` 补量一次。tip 挂在目标元素旁边、由 `target` 指回去。
 */

import type { CSSProperties } from 'react';
import { useCallback, useLayoutEffect, useState } from 'react';
import { Tooltip, UnstyledButton } from '@mantine/core';

import { useHoverIntent } from '@/hooks/useHoverIntent';
import { cx } from '@/utils/cx';

import useIsTruncated from './hooks/useIsTruncated';
import type { FreeTruncatedTextProps } from './types';
import { resolveMiddleEllipsis } from './utils';

import styles from './index.scss';

const FreeTruncatedText = ({
  className,
  disabled = false,
  ellipsis = 'middle',
  inline = false,
  lines = 1,
  onClick,
  position = 'right',
  text,
  tipDark = false,
}: FreeTruncatedTextProps) => {
  const { measure, ref, targetRef } = useIsTruncated();
  const isMiddle = ellipsis === 'middle';
  const lineCount = Math.max(1, Math.trunc(lines));
  /**
   * 被指到的那一刻量出来的「是否截断」。**记着它量的是哪一段原文**：原文换了
   * （弹窗标题从这一条切到下一条）就按「还没量、放得下」算，tip 不沿用上一条的结论。
   */
  const [measured, setMeasured] = useState({ source: '', truncated: false });
  /**
   * middle 档的拼好文案，记着它是「哪一段原文、几行」量的：两者任一变了就回落全文，
   * 等重算一次（见下面的 `useLayoutEffect`）。end 档不需要状态，直接用 `text`。
   */
  const [middleText, setMiddleText] = useState({
    display: text,
    lines: lineCount,
    source: text,
  });

  const measureKind = lineCount > 1 ? 'height' : 'width';
  const truncated = measured.source === text && measured.truncated;
  const displayText =
    isMiddle && middleText.source === text && middleText.lines === lineCount
      ? middleText.display
      : text;

  /**
   * middle 档：按容器实际排版算头 / 尾 / 省略号，省略号落在最后一行的水平中间。
   * 藏在隐藏视图里时盒子尺寸为 0，量不出结论，先按全文渲染，不误截断。
   */
  const resolveMiddle = useCallback(() => {
    if (!isMiddle) {
      return;
    }

    const element = targetRef.current;

    if (element === null) {
      return;
    }

    setMiddleText({
      display: resolveMiddleEllipsis({ element, lines: lineCount, text }),
      lines: lineCount,
      source: text,
    });
  }, [isMiddle, lineCount, targetRef, text]);

  /** 组合 ref：先登记目标节点供 tip 定位与测量，再跑 middle 档的首次测量 */
  const handleRef = useCallback(
    (node: HTMLElement | null) => {
      ref(node);

      if (node !== null) {
        resolveMiddle();
      }
    },
    [ref, resolveMiddle],
  );

  /**
   * 文案或行数变了要重算：节点不一定重挂，ref 回调不会再响，不补这一次就会一直停在全文
   * （或停在上一档行数的拼法）。首次挂载时 ref 回调已经算过（两者都已对齐），这里自然空转。
   */
  useLayoutEffect(() => {
    if (
      isMiddle &&
      (middleText.source !== text || middleText.lines !== lineCount)
    ) {
      resolveMiddle();
    }
  }, [
    isMiddle,
    lineCount,
    middleText.lines,
    middleText.source,
    resolveMiddle,
    text,
  ]);

  const checkTruncation = useCallback(() => {
    setMeasured({
      source: text,
      truncated: isMiddle ? displayText !== text : measure(measureKind),
    });
  }, [displayText, isMiddle, measure, measureKind, text]);

  const [active, hoverHandlers] = useHoverIntent(checkTruncation);

  const classes = cx(
    styles.text,
    inline && styles.inline,
    lineCount > 1 && styles.multiline,
    lineCount > 1 && !isMiddle && styles.clamp,
    isMiddle && styles.middle,
    className,
  );

  /** 多行尾部省略的行数交给 `-webkit-line-clamp`；middle 档的文案已经算准，不需要它 */
  const lineStyle =
    lineCount > 1 && !isMiddle
      ? ({ '--freeTruncatedLines': lineCount } as CSSProperties)
      : undefined;

  const content = onClick ? (
    <UnstyledButton
      className={classes}
      disabled={disabled}
      onClick={onClick}
      ref={handleRef}
      style={lineStyle}
      type="button"
      {...hoverHandlers}
    >
      {displayText}
    </UnstyledButton>
  ) : (
    <span className={classes} ref={handleRef} style={lineStyle} {...hoverHandlers}>
      {displayText}
    </span>
  );

  /** 三者缺一就不挂 tip：没被指到、文本放得下、或当前禁用 */
  const showTip = active && truncated && !disabled;

  return (
    <>
      {content}
      {showTip ? (
        <Tooltip
          arrowSize={5}
          classNames={{
            tooltip: cx(styles.tooltip, tipDark && styles.tooltipDark),
          }}
          label={text}
          multiline
          offset={10}
          opened
          position={position}
          radius={4}
          target={targetRef}
          withArrow
        />
      ) : null}
    </>
  );
};

export default FreeTruncatedText;
