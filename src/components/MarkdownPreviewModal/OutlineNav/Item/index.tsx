/**
 * 标题导航的单条：可点击按钮；省略号与「只在被截断时才弹 tip」交给公共组件 TruncatedText。
 */

import TruncatedText from '@/components/TruncatedText';
import { cx } from '@/utils/cx';

import type { OutlineNavItemProps } from '../../types';

import { LEVEL_CLASS } from './constants';

import styles from './index.scss';

const OutlineNavItem = ({ disabled, level, onSelect, text }: OutlineNavItemProps) => (
  <TruncatedText
    className={cx(styles.item, LEVEL_CLASS[level])}
    disabled={disabled}
    onClick={onSelect}
    text={text}
  />
);

export default OutlineNavItem;
