/** 弹窗 header 的翻页 / 计数：左右两颗箭头与当前序号，标签与提示由调用方给。 */

import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';

import type { FreeModalNav } from '../types';

import styles from './index.scss';

type HeaderNavProps = {
  iconSize: number;
  iconStroke: number;
  nav: FreeModalNav;
  tip: (label: string) => string;
  tipDark?: boolean;
};

const HeaderNav = ({
  iconSize,
  iconStroke,
  nav,
  tip,
  tipDark,
}: HeaderNavProps) => (
  <>
    <FreeIconAction
      disabled={nav.disabled === true || nav.onPrevious === null}
      label={nav.previousLabel ?? '上一个'}
      onClick={nav.onPrevious ?? undefined}
      tipDark={tipDark}
      tooltipLabel={tip(nav.previousLabel ?? '上一个')}
    >
      <IconChevronLeft size={iconSize} stroke={iconStroke} />
    </FreeIconAction>
    <FreeIconAction
      disabled={nav.disabled === true || nav.onNext === null}
      label={nav.nextLabel ?? '下一个'}
      onClick={nav.onNext ?? undefined}
      tipDark={tipDark}
      tooltipLabel={tip(nav.nextLabel ?? '下一个')}
    >
      <IconChevronRight size={iconSize} stroke={iconStroke} />
    </FreeIconAction>
    <span className={styles.position}>
      {nav.index} / {nav.total}
    </span>
  </>
);

export default HeaderNav;
