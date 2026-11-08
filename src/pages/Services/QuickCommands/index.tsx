/**
 * 全局快捷命令弹窗：展示 ~/.zshrc 中的别名与函数。
 * 数据由 agent 动态解析下发（GET /api/cli-commands），
 * 打开弹窗时读取别名/函数，无需改前端代码。
 * 每行左右布局（命令 | 说明），点击命令可复制；单行组件在 CommandRow 里。
 */

import { useEffect, useMemo, useState } from 'react';
import { ActionIcon, Button, Group, Modal } from '@mantine/core';
import { IconRefresh, IconTerminal2 } from '@tabler/icons-react';

import { fetchCliCommands } from '@/services/api';
import { useServices } from '@/services/hooks/useServices';
import type { CliCommand } from '@/services/types';
import { getErrorMessage } from '@/utils/error';

import CommandRow from './CommandRow';
import { GROUP_LABELS, GROUP_ORDER } from './constants';

import styles from './index.scss';

/** 按分组名把命令归堆：一次遍历建 Map，避免每个分组各扫一遍全量命令 */
const groupCommands = (
  commands: CliCommand[],
): Array<{ key: string; label: string; items: CliCommand[] }> => {
  const byGroup = new Map<string, CliCommand[]>();

  for (const command of commands) {
    const bucket = byGroup.get(command.group) ?? [];

    bucket[bucket.length] = command;
    byGroup.set(command.group, bucket);
  }

  return GROUP_ORDER.map((key) => ({
    key,
    label: GROUP_LABELS[key],
    items: byGroup.get(key) ?? [],
  })).filter((group) => group.items.length > 0);
};

/** 全局快捷命令弹窗（动态读取 ~/.zshrc） */
const QuickCommands = () => {
  const { agentOnline } = useServices();
  const [opened, setOpened] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commands, setCommands] = useState<CliCommand[]>([]);
  /** 读取失败的原因；null 表示没失败 */
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened || !agentOnline) {
      return undefined;
    }

    let alive = true;

    const load = async () => {
      setLoading(true);

      try {
        const result = await fetchCliCommands();

        if (!alive) {
          return;
        }

        setCommands(result.commands);
        setError(null);
      } catch (err) {
        if (alive) {
          setError(getErrorMessage(err, '读取 ~/.zshrc 失败'));
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    const timerId = window.setTimeout(() => void load(), 0);

    return () => {
      alive = false;
      window.clearTimeout(timerId);
    };
  }, [opened, agentOnline, revision]);

  const groups = useMemo(() => groupCommands(commands), [commands]);

  const renderBody = () => {
    if (!agentOnline) {
      return <div className={styles.empty}>连接恢复后显示快捷命令。</div>;
    }

    if (loading) {
      return <div className={styles.empty}>正在读取快捷命令…</div>;
    }

    if (error) {
      return <div className={styles.empty}>读取失败：{error}</div>;
    }

    if (groups.length === 0) {
      return <div className={styles.empty}>未发现别名或函数</div>;
    }

    return (
      <div className={styles.body}>
        {groups.map((group) => (
          <div className={styles.group} key={group.key}>
            <div className={styles.groupName}>{group.label}</div>
            {group.items.map((item) => (
              <CommandRow desc={item.desc} key={item.name} name={item.name} />
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Button
        aria-haspopup="dialog"
        leftSection={<IconTerminal2 aria-hidden="true" size={14} />}
        onClick={() => setOpened(true)}
        size="xs"
        variant="light"
      >
        全局快捷命令
      </Button>
      <Modal.Root
        centered
        onClose={() => setOpened(false)}
        opened={opened}
        size="lg"
      >
        <Modal.Overlay />
        <Modal.Content>
          <Modal.Header>
            <Modal.Title>全局快捷命令</Modal.Title>
            <Group gap="xs" wrap="nowrap">
              <ActionIcon
                aria-label="刷新快捷命令"
                disabled={!agentOnline || loading}
                onClick={() => setRevision((current) => current + 1)}
                title="刷新快捷命令"
                variant="subtle"
              >
                <IconRefresh aria-hidden="true" size={18} />
              </ActionIcon>
              <Modal.CloseButton aria-label="关闭全局快捷命令" />
            </Group>
          </Modal.Header>
          <Modal.Body>{renderBody()}</Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </>
  );
};

export default QuickCommands;
