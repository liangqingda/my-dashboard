import { useEffect, useRef, useState } from 'react';
import { Textarea } from '@mantine/core';

import ConfirmModal from '@/components/modals/ConfirmModal';

import type { RenameEntryModalProps } from './types';

/**
 * 条目改名弹窗：名字可能较长，不在瓦片上就地输入，改用弹窗里的多行文本域编辑。
 * 打开即聚焦文本域并全选原名；回车保存，Shift+回车换行；空名或未改动时保存按钮禁用。
 * 切换改名对象时由页面用 key 重挂载，初始值直接取当前条目名。
 */
const RenameEntryModal = ({
  entry,
  loading,
  onCancel,
  onCommit,
}: RenameEntryModalProps) => {
  const [value, setValue] = useState(entry?.name ?? '');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const opened = entry !== null;

  /*
   * 弹窗正文走过渡层延迟挂载，挂载回调时文本域可能还不在 DOM 里；打开后下一拍再聚焦并全选。
   * 表单弹窗关掉焦点陷阱，避免外壳把初始焦点留在隐藏节点上
   */
  useEffect(() => {
    if (!opened) {
      return undefined;
    }

    const focusField = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    focusField();
    const timer = window.setTimeout(focusField);

    return () => window.clearTimeout(timer);
  }, [opened]);

  const trimmed = value.trim();
  const canSubmit =
    entry !== null && trimmed !== '' && trimmed !== entry.name && !loading;

  const handleCommit = () => {
    if (canSubmit) {
      onCommit(trimmed);
    }
  };

  /** 回车提交；Shift+回车保留文本域默认的换行行为 */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleCommit();
    }
  };

  const isFile = entry?.kind === 'file';

  return (
    <ConfirmModal
      confirmDisabled={!canSubmit}
      confirmLabel="保存"
      description={
        isFile
          ? '输入新的文件名（含扩展名）；空名或未改动不会提交。回车保存，Shift+回车换行。'
          : '输入新的文件夹名；空名或未改动不会提交。回车保存，Shift+回车换行。'
      }
      loading={loading}
      onCancel={onCancel}
      onConfirm={handleCommit}
      opened={opened}
      size={420}
      title={isFile ? '重命名文件' : '重命名文件夹'}
      trapFocus={false}
    >
      <Textarea
        aria-label={isFile ? '文件名' : '文件夹名'}
        autosize
        maxRows={6}
        minRows={3}
        mt="sm"
        onChange={(event) => setValue(event.currentTarget.value)}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={handleKeyDown}
        ref={inputRef}
        value={value}
      />
    </ConfirmModal>
  );
};

export default RenameEntryModal;
