import { UnstyledButton } from '@mantine/core';
import {
  IconChevronRight,
  IconDeviceDesktop,
  IconDeviceUsb,
  IconHome,
} from '@tabler/icons-react';

import { describePathRoot } from '../utils/files';

import type { DirBreadcrumbProps } from './types';

import styles from './index.scss';

/**
 * 当前目录面包屑：根按路径自动换形态——主目录下的路径以「家」为根（用户名 + 房子图标），
 * 外接卷下的路径以该卷为根（卷名 + 移动盘图标），其余以「本机（`/`）」为根；
 * 根之下的分段逐层可点，末段是当前目录只展示。点根回到根所在的那一层。
 * 路径根与分段数据归纯函数（`describePathRoot`），这里只排图标、分段与点击事件。
 */
const ROOT_ICONS = {
  computer: IconDeviceDesktop,
  home: IconHome,
  volume: IconDeviceUsb,
} as const;

const DirBreadcrumb = ({ currentDir, onNavigate }: DirBreadcrumbProps) => {
  const root = describePathRoot(currentDir);
  const RootIcon = ROOT_ICONS[root.kind];

  return (
    <nav aria-label="当前目录路径" className={styles.breadcrumb}>
      {currentDir ? (
        <>
          {currentDir === root.path ? (
            <span className={styles.current}>
              <RootIcon aria-hidden="true" size={14} />
              {root.label}
            </span>
          ) : (
            <UnstyledButton
              className={styles.root}
              onClick={() => onNavigate(root.path)}
              type="button"
            >
              <RootIcon aria-hidden="true" size={14} />
              {root.label}
            </UnstyledButton>
          )}
          {root.segments.map((segment, index) => {
            const isLast = index === root.segments.length - 1;

            return (
              <span className={styles.segment} key={segment.path}>
                <IconChevronRight
                  aria-hidden="true"
                  className={styles.separator}
                  size={13}
                />
                {isLast ? (
                  <span className={styles.current}>{segment.label}</span>
                ) : (
                  <UnstyledButton
                    className={styles.link}
                    onClick={() => onNavigate(segment.path)}
                    type="button"
                  >
                    {segment.label}
                  </UnstyledButton>
                )}
              </span>
            );
          })}
        </>
      ) : (
        <span className={styles.placeholder}>未选择目录</span>
      )}
    </nav>
  );
};

export default DirBreadcrumb;
