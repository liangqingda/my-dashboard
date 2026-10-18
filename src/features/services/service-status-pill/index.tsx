/**
 * 服务状态徽标：根据 running 与 build 派生展示文案和颜色。
 * 展示在渲染期直接推导，无需 effect。
 */

import type { BuildState } from '@/features/services/types';

import styles from './index.scss';

type PillTone = 'ok' | 'warn' | 'danger' | 'muted';

type PillView = {
  label: string;
  tone: PillTone;
};

/** 由运行态 + 编译态推导徽标文案与色系 */
const deriveView = (build: BuildState, running: boolean): PillView => {
  if (running) {
    if (build === 'ok') {return { label: '运行中', tone: 'ok' };}

    if (build === 'fail') {return { label: '编译失败', tone: 'danger' };}

    return { label: '启动中', tone: 'warn' };
  }

  return build === 'fail'
    ? { label: '启动失败', tone: 'danger' }
    : { label: '已停止', tone: 'muted' };
};

export type ServiceStatusPillProps = {
  /** 编译 / 启动状态 */
  build: BuildState;
  /** 是否在运行 */
  running: boolean;
  /** 额外类名 */
  className?: string;
};

const ServiceStatusPill = ({ build, running, className }: ServiceStatusPillProps) => {
  const { label, tone } = deriveView(build, running);

  return (
    <span className={`${styles.pill} ${styles[tone]} ${className ?? ''}`} data-tone={tone}>
      <span aria-hidden="true" className={styles.dot} />
      {label}
    </span>
  );
};

export default ServiceStatusPill;
