/**
 * 省略文本：容器放不下才省略，且**只有被省略时**才在 hover / 键盘聚焦时用 tip 展示完整内容。
 * 文本本来就放得下时不弹任何提示，不给读者加噪音。
 *
 * 默认单行、尾部省略；`lines={2}` 时截到两行。`ellipsis="middle"` 改为中间省略：
 * 头部与尾部都保留，省略号落在中间（文件名这类尾部扩展名重要的场景用）。
 *
 * end 档的 tip 与测量都推迟到「被指到的那一刻」（见 `useHoverIntent`）：列表里几百个条目
 * 各自常驻一个 Tooltip 会白付几百套浮动定位实例的挂载成本，各自挂一个 ResizeObserver
 * 测量则会拆成几百次强制重排。middle 档做不到推迟——中间省略的拼法必须在节点挂上后定好，
 * 所以在回调 ref 里量一次（节点挂上即量），不挂常驻观察器。tip 挂在目标元素旁边、由 `target` 指回去。
 */

import { useCallback, useState } from 'react';
import { Tooltip, UnstyledButton } from '@mantine/core';

import { useHoverIntent } from '@/hooks/useHoverIntent';
import { cx } from '@/utils/cx';

import useIsTruncated from './hooks/useIsTruncated';
import type { FreeTruncatedTextProps } from './types';

import styles from './index.scss';

const ELLIPSIS = '…';

/**
 * 头尾各留一段拼中间省略；`keep` 是省略号之外保留的字符总数，头稍多一点。
 * 省略号本身不计入 `keep`。
 */
const middleCandidate = (text: string, keep: number): string => {
  if (text.length <= keep) {
    return text;
  }

  const head = Math.ceil(keep / 2);
  const tail = keep - head;

  return `${text.slice(0, head)}${ELLIPSIS}${text.slice(text.length - tail)}`;
};

const FreeTruncatedText = ({
  className,
  disabled = false,
  ellipsis = 'end',
  inline = false,
  lines = 1,
  onClick,
  position = 'right',
  text,
}: FreeTruncatedTextProps) => {
  const { measure, ref, targetRef } = useIsTruncated();
  const isMiddle = ellipsis === 'middle';
  /** 被指到的那一刻量出来的结果；没量过就是「放得下」，不弹 tip */
  const [truncated, setTruncated] = useState(false);
  /** middle 档渲染用的拼好文案；end 档恒等于原文 */
  const [displayText, setDisplayText] = useState(text);

  const measureKind = lines === 2 ? 'height' : 'width';

  /**
   * middle 档：节点挂上后按容器尺寸二分出**能放下的最多**头尾字符，写回状态渲染。
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

    element.textContent = text;

    if (element.clientWidth === 0 && element.clientHeight === 0) {
      setDisplayText(text);

      return;
    }

    if (!measure(measureKind)) {
      setDisplayText(text);

      return;
    }

    let low = 1;
    let high = text.length - 1;
    let best = text;

    while (low <= high) {
      const keep = Math.floor((low + high) / 2);
      const candidate = middleCandidate(text, keep);

      element.textContent = candidate;

      if (!measure(measureKind)) {
        // 放得下：还能多留字符，往更大的 keep 搜
        best = candidate;
        low = keep + 1;
      } else {
        // 放不下：往更少的 keep 收
        high = keep - 1;
      }
    }

    element.textContent = best;
    setDisplayText(best);
  }, [isMiddle, measure, measureKind, targetRef, text]);

  /** 组合 ref：先登记目标节点供 tip 定位与测量，再跑 middle 档的一次性测量 */
  const handleRef = useCallback(
    (node: HTMLElement | null) => {
      ref(node);

      if (node !== null) {
        resolveMiddle();
      }
    },
    [ref, resolveMiddle],
  );

  const checkTruncation = useCallback(() => {
    setTruncated(isMiddle ? displayText !== text : measure(measureKind));
  }, [displayText, isMiddle, measure, measureKind, text]);

  const [active, hoverHandlers] = useHoverIntent(checkTruncation);

  const classes = cx(
    styles.text,
    inline && styles.inline,
    lines === 2 && styles.clamp2,
    className,
  );

  const content = onClick ? (
    <UnstyledButton
      className={classes}
      disabled={disabled}
      onClick={onClick}
      ref={handleRef}
      type="button"
      {...hoverHandlers}
    >
      {displayText}
    </UnstyledButton>
  ) : (
    <span className={classes} ref={handleRef} {...hoverHandlers}>
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
          classNames={{ tooltip: styles.tooltip }}
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
