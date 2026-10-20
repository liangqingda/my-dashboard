/**
 * 全局快捷命令弹窗：展示 ~/.zshrc 中的别名与函数。
 * 数据由 agent 动态解析下发（GET /api/cli-commands），
 * 打开弹窗时读取别名/函数，无需改前端代码。
 * 每行左右布局（命令 | 说明），点击命令可复制。
 */

import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Button, Group, Modal } from '@mantine/core';
import {
  IconCheck,
  IconCopy,
  IconRefresh,
  IconTerminal2,
} from '@tabler/icons-react';

import { fetchCliCommands, type CliCommand } from '@/features/services/api';
import { useServices } from '@/features/services/hooks/useServices';

import styles from './index.scss';

/** 分组展示顺序 */
const GROUP_ORDER = ['alias', 'postgres', 'redis', 'other'] as const;

/** 分组标题 */
const GROUP_LABEL: Record<string, string> = {
  alias: '常用别名',
  postgres: 'PostgreSQL',
  redis: 'Redis',
  other: '其他函数',
};

/** 复制文本到剪贴板；优先 Clipboard API，失败回退 execCommand */
const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');

      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      const copied = document.execCommand('copy');

      document.body.removeChild(ta);

      return copied;
    } catch {
      return false;
    }
  }
};

/** 单行命令：左右布局（命令 | 说明 | 复制），点击整行复制 */
const CommandRow = ({ name, desc }: { name: string; desc: string }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopy = async () => {
    const ok = await copyText(name);

    setCopied(ok);
    window.clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      className={styles.row}
      onClick={() => void handleCopy()}
      title="点击复制命令"
      type="button"
    >
      <code className={styles.command}>{name}</code>
      <span className={styles.desc}>{desc}</span>
      <span className={styles.copy}>
        {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
      </span>
    </button>
  );
};

/** 全局快捷命令弹窗（动态读取 ~/.zshrc） */
const QuickCommands = () => {
  const { agentOnline } = useServices();
  const [opened, setOpened] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commands, setCommands] = useState<CliCommand[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!opened || !agentOnline) {
      return;
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
        setFailed(false);
      } catch {
        if (alive) {
          setFailed(true);
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

  const groups = GROUP_ORDER.map((key) => ({
    key,
    label: GROUP_LABEL[key],
    items: commands.filter((c) => c.group === key),
  })).filter((g) => g.items.length > 0);

  const renderBody = () => {
    if (!agentOnline) {
      return <div className={styles.empty}>连接恢复后显示快捷命令。</div>;
    }

    if (loading) {
      return <div className={styles.empty}>正在读取快捷命令…</div>;
    }

    if (failed) {
      return (
        <div className={styles.empty}>
          （读取 ~/.zshrc 失败，请确认 agent 在线）
        </div>
      );
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
