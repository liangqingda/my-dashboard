/**
 * 全局快捷命令卡片：展示 ~/.zshrc 中的别名与函数。
 * 数据由 agent 动态解析下发（GET /api/cli-commands），
 * 因此新增别名/函数后会自动出现，无需改前端代码。
 * 每行左右布局（命令 | 说明），点击命令可复制。
 */

import { useEffect, useState } from 'react';
import { IconCheck, IconCopy } from '@tabler/icons-react';

import {
  fetchCliCommands,
  type CliCommand,
} from '@/features/services/api';

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

/** 轮询间隔：让新增命令自动出现 */
const POLL_MS = 20_000;

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
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
};

/** 单行命令：左右布局（命令 | 说明 | 复制），点击整行复制 */
const CommandRow = ({ name, desc }: { name: string; desc: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyText(name);

    setCopied(ok);
    setTimeout(() => setCopied(false), 1500);
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

/** 全局快捷命令卡片（动态读取 ~/.zshrc） */
const QuickCommands = () => {
  const [commands, setCommands] = useState<CliCommand[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const result = await fetchCliCommands();

        if (!alive) {return;}

        setCommands(result.commands);
        setFailed(false);
      } catch {
        if (alive) {setFailed(true);}
      }
    };

    void load();
    const timer = setInterval(() => void load(), POLL_MS);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const groups = GROUP_ORDER.map((key) => ({
    key,
    label: GROUP_LABEL[key],
    items: commands.filter((c) => c.group === key),
  })).filter((g) => g.items.length > 0);

  const renderBody = () => {
    if (failed) {
      return <div className={styles.empty}>（读取 ~/.zshrc 失败，请确认 agent 在线）</div>;
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
    <section aria-label="全局快捷命令" className={styles.card}>
      <header className={styles.header}>
        <span className={styles.title}>全局快捷命令</span>
        <span className={styles.note}>来自 ~/.zshrc · 自动发现</span>
      </header>
      {renderBody()}
    </section>
  );
};

export default QuickCommands;
