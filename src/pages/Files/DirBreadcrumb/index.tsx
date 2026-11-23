import { UnstyledButton } from '@mantine/core';
import { IconChevronRight, IconDeviceDesktop } from '@tabler/icons-react';

import { splitPathSegments } from '../utils/files';

import type { DirBreadcrumbProps } from './types';

import styles from './index.scss';

/**
 * 当前目录面包屑：以「本机（`/`）」为根起步，逐层分段可点；末段是当前目录，只展示不可点。
 * 根不是主目录——从收藏的「系统应用程序」进 `/Applications` 这类根级路径时，主目录图标
 * 既不对也回不去；现在根固定是磁盘根，点它回 `/`。
 * 路径本身与分段数据归纯函数，这里只排根、分段与点击事件。
 */
const DirBreadcrumb = ({ currentDir, onNavigate }: DirBreadcrumbProps) => {
  const pathSegments = splitPathSegments(currentDir);

  return (
    <nav aria-label="当前目录路径" className={styles.breadcrumb}>
      {currentDir ? (
        <>
          {currentDir === '/' ? (
            <span className={styles.current}>
              <IconDeviceDesktop aria-hidden="true" size={14} />
              本机
            </span>
          ) : (
            <UnstyledButton
              className={styles.root}
              onClick={() => onNavigate('/')}
              type="button"
            >
              <IconDeviceDesktop aria-hidden="true" size={14} />
              本机
            </UnstyledButton>
          )}
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
