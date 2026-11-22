import { useState } from 'react';
import { Textarea } from '@mantine/core';

import ConfirmModal from '@/components/modals/ConfirmModal';

import type { RenameFileModalProps } from './types';

/**
 * 文件改名弹窗：文件名可能较长，不在瓦片上就地输入，改用弹窗里的多行文本域编辑。
 * 空名或未改动时保存按钮禁用；改名成功与否由页面层收口，这里只采集新名字。
 * 切换改名对象时由页面用 key 重挂载，输入框初始值直接取当前文件名。
 */
const RenameFileModal = ({
  file,
  loading,
  onCancel,
  onCommit,
}: RenameFileModalProps) => {
  const [value, setValue] = useState(file?.name ?? '');

  const trimmed = value.trim();
  const canSubmit =
    file !== null && trimmed !== '' && trimmed !== file.name && !loading;

  const handleCommit = () => {
    if (canSubmit) {
      onCommit(trimmed);
    }
  };

  return (
    <ConfirmModal
      confirmDisabled={!canSubmit}
      confirmLabel="保存"
      description="输入新的文件名（含扩展名）；空名或未改动不会提交。"
      loading={loading}
      onCancel={onCancel}
      onConfirm={handleCommit}
      opened={file !== null}
      size={420}
      title="重命名文件"
    >
      <Textarea
        aria-label="文件名"
        autosize
        maxRows={6}
        minRows={3}
        mt="sm"
        onChange={(event) => setValue(event.currentTarget.value)}
        onFocus={(event) => event.currentTarget.select()}
        value={value}
      />
    </ConfirmModal>
  );
};

export default RenameFileModal;
