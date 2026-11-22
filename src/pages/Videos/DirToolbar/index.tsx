import { useState } from 'react';
import { Button, Group, UnstyledButton } from '@mantine/core';
import { IconChevronRight, IconFolderOpen, IconHome } from '@tabler/icons-react';

import FreeInput from '@/components/fields/FreeInput';

import {
  DIR_INPUT_PLACEHOLDER,
  DIR_INPUT_WIDTH,
} from '../constants';
import { splitPathSegments } from '../utils/videos';

import type { DirToolbarProps } from './types';

import styles from './index.scss';

/**
 * 目录工具栏：上行是当前路径面包屑（点某一段回到那一层），下行是路径输入框与「打开」按钮。
 * 输入框草稿由工具栏自己持有；外部切目录（面包屑 / 打开成功）时按渲染期校准回显。
 */
const DirToolbar = ({
  currentDir,
  loading,
  onOpenDir,
  onNavigate,
}: DirToolbarProps) => {
  const [draft, setDraft] = useState(currentDir);
  const [syncedDir, setSyncedDir] = useState(currentDir);

  /*
   * 外部路径变化（面包屑回退、打开新目录）后，输入框跟着回显当前目录：
   * 渲染期校准状态，不用 effect 再跑一轮 setState
   */
  if (currentDir !== syncedDir) {
    setSyncedDir(currentDir);
    setDraft(currentDir);
  }

  const segments = splitPathSegments(currentDir);

  const submit = () => {
    onOpenDir(draft);
  };

  return (
    <div className={styles.toolbar}>
      <Group className={styles.breadcrumb} gap={4} wrap="wrap">
        {segments.length > 0 ? (
          <>
            <IconHome aria-hidden="true" className={styles.home} size={14} />
            {segments.map((segment, index) => {
              const last = index === segments.length - 1;

              return (
                <span className={styles.segment} key={segment.path}>
                  <IconChevronRight
                    aria-hidden="true"
                    className={styles.separator}
                    size={13}
                  />
                  {last ? (
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
      </Group>

      <Group gap="sm" wrap="nowrap">
        <FreeInput
          ariaLabel="本地目录路径"
          leftSection={<IconFolderOpen size={15} stroke={1.9} />}
          onChange={setDraft}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              submit();
            }
          }}
          placeholder={DIR_INPUT_PLACEHOLDER}
          value={draft}
          width={DIR_INPUT_WIDTH}
        />
        <Button
          disabled={loading}
          onClick={submit}
          size="xs"
          variant="light"
        >
          打开
        </Button>
      </Group>
    </div>
  );
};

export default DirToolbar;
