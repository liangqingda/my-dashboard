/**
 * 文件页安全锁：进入页面前先问一次密码，对了才放行。
 *
 * 这扇窗**关不掉**：没有关闭按钮，Esc / 遮罩 / 空格都不响应，只有「返回」与「进入」两个出口
 * —— 它挡的是整个页面的正文，随手一点就能绕过去就等于没有锁。
 * 密码不做任何强度 / 格式限制（设置面板里也是原样输入），这里只做逐字比对；
 * 对不上就把输入框标红，不改输入内容，方便原地改一个字再试。
 */

import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button, Group, Text } from '@mantine/core';
import { useNavigate } from 'react-router';

import FreeInput from '@/components/fields/FreeInput';
import FreeModal from '@/components/modals/FreeModal';

import type { FilesLockGateProps } from './types';

import styles from './index.scss';

/** 输入错了的提示：只在这一扇窗里出现，不弹全局通知 */
const WRONG_PASSWORD_HINT = '密码不对，再试一次';

const FilesLockGate = ({ onUnlock }: FilesLockGateProps) => {
  const [value, setValue] = useState('');
  const [failed, setFailed] = useState(false);
  /** 输入框本体：弹窗正文可能晚一拍挂载，聚焦自己来做（不靠 `autoFocus` 赌时机） */
  const inputRef = useRef<HTMLInputElement | null>(null);
  /** 「返回」＝退出这一页：不给「关掉窗继续看列表」这条路 */
  const navigate = useNavigate();
  const cancel = () => navigate('/');

  const submit = () => {
    if (value === '') {
      return;
    }

    if (!onUnlock(value)) {
      setFailed(true);
    }
  };

  /*
   * 打开即聚焦：表单弹窗关掉焦点陷阱，免得外壳把焦点留在别处；正文走过渡层挂载，
   * 所以挂载后下一拍再补一次聚焦。
   */
  useEffect(() => {
    inputRef.current?.focus();
    const timer = window.setTimeout(() => inputRef.current?.focus());

    return () => window.clearTimeout(timer);
  }, []);

  /** 回车与「进入」同一口径：确认窗里回车就是确定 */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  return (
    <FreeModal
      closeButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      closeOnSpace={false}
      height="auto"
      onClose={cancel}
      opened
      shortcutsEnabled={false}
      size={400}
      title="这个页面需要密码"
      trapFocus={false}
    >
      <form className={styles.gate} onSubmit={handleSubmit}>
        <Text className={styles.hint}>
          输入密码后进入文件页；密码与开关都在页面的设置面板里改。
        </Text>
        <FreeInput
          ariaLabel="页面密码"
          inputRef={inputRef}
          onChange={(next) => {
            setValue(next);
            setFailed(false);
          }}
          placeholder="输入密码"
          type="password"
          value={value}
        />
        {failed ? <Text className={styles.error}>{WRONG_PASSWORD_HINT}</Text> : null}
        <Group gap="sm" justify="flex-end">
          <Button onClick={cancel} size="sm" type="button" variant="default">
            返回
          </Button>
          <Button disabled={value === ''} size="sm" type="submit">
            进入
          </Button>
        </Group>
      </form>
    </FreeModal>
  );
};

export default FilesLockGate;
