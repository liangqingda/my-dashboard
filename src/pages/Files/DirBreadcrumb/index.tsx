import { UnstyledButton } from '@mantine/core';
import { IconChevronRight, IconHome } from '@tabler/icons-react';

import { cx } from '@/utils/cx';

import { splitPathSegments } from '../utils/files';

import type { DirBreadcrumbProps } from './types';

import styles from './index.scss';

/**
 * 当前目录面包屑：主目录图标起步，逐层分段可点；末段是当前目录，只展示不可点。
 * 路径本身与分段数据归纯函数，这里只排分段与点击事件。
 * `divider` 由页面按展示形式传：表格视图没有卡片底托，用一条下边框把路径和表格分开。
 */
const DirBreadcrumb = ({
  currentDir,
  divider = false,
  onNavigate,
}: DirBreadcrumbProps) => {
  const pathSegments = splitPathSegments(currentDir);

  return (
    <nav
      aria-label="当前目录路径"
      className={cx(styles.breadcrumb, divider && styles.divider)}
    >
      {pathSegments.length > 0 ? (
        <>
          <IconHome aria-hidden="true" className={styles.home} size={14} />
          {pathSegments.map((segment, index) => {
            const isLast = index === pathSegments.length - 1;

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
