/**
 * 快捷命令单行：点击整行复制命令，复制成功后 1.5 秒内显示对勾。
 */

import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconCopy } from '@tabler/icons-react';

import { COPY_FEEDBACK_DURATION, copyText } from '@/utils/clipboard';

import type { CommandRowProps } from './types';

import styles from './index.scss';

const CommandRow = ({ desc, name }: CommandRowProps) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopy = async () => {
    const ok = await copyText(name);

    setCopied(ok);
    window.clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
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

export default CommandRow;
