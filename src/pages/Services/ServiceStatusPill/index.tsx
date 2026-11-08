/**
 * 服务状态徽标：根据 running 与 build 派生展示文案和颜色。
 * 展示在渲染期直接推导，无需 effect。
 */

import { cx } from '@/utils/cx';

import { deriveStatusView } from '../utils';

import type { ServiceStatusPillProps } from './types';

import styles from './index.scss';

const ServiceStatusPill = ({
  build,
  running,
  className,
  compact = false,
}: ServiceStatusPillProps) => {
  const { label, tone } = deriveStatusView({ build, running });

  return (
    <span
      className={cx(
        styles.pill,
        compact && styles.compact,
        styles[tone],
        className,
      )}
      data-tone={tone}
    >
      <span aria-hidden="true" className={styles.dot} />
      {label}
    </span>
  );
};

export default ServiceStatusPill;
