/**
 * 删除前的二次确认层（叠在主预览上面的一层）。
 *
 * 它只做三件事：把「删掉会发生什么」原样说一遍（文案由调用方给，组件不知道文档落在哪里）、
 * 给一组可选的「这次删什么」勾选项（同样只画 checkbox，语义在调用方），
 * 以及给两个出口——取消 / 删除。确认后真正删除的动作也在调用方手里。
 *
 * 排版按「先读、再选、最后做」：标题区（「删除这个文档？」+ 被删文档的路径）→ 说明块 →
 * 勾选项（紧凑一行，只在 hover 时用 tooltip 补一句这东西指什么）→ 一条细线 →
 * 靠右的两个按钮。勾选项不塞进按钮行：那一行留给「取消 / 删除」，选择本身属于内容区。
 *
 * 勾选项一变，说明块就按调用方给的函数重算——「这次会少删哪一样」在按下删除之前就看得见。
 * 一项都没勾时没有可删的东西，删除按钮直接不可点。
 */

import { Checkbox, Group, Text, Tooltip } from '@mantine/core';

import ConfirmModal from '@/components/modals/ConfirmModal';

import type { DeleteConfirmProps } from '../types';

import styles from './index.scss';

const DeleteConfirm = ({
  checkedKeys,
  choices,
  description,
  loading,
  onCancel,
  onCheckedKeysChange,
  onConfirm,
  opened,
  title,
}: DeleteConfirmProps) => {
  const text =
    typeof description === 'string' ? description : description(checkedKeys);
  /** 有勾选项却一项没勾：没有可删的，确认按钮不可点 */
  const nothingChecked = choices !== undefined && checkedKeys.length === 0;

  return (
    <ConfirmModal
      closeLabel="关闭删除确认"
      confirmDisabled={nothingChecked}
      confirmLabel="删除"
      danger
      description={
        <>
          <Text
            className={styles.dataPath}
            ff="var(--mantine-font-family-monospace)"
            size="xs"
          >
            {title}
          </Text>
          <Text size="sm">{text}</Text>
        </>
      }
      loading={loading}
      onCancel={onCancel}
      onConfirm={onConfirm}
      opened={opened}
      title="删除这个文档？"
    >
      {/* 勾选项：紧凑一行，细节靠 hover 的 tooltip 补，不占正文位置 */}
      {choices ? (
        <Checkbox.Group
          className={styles.choices}
          onChange={onCheckedKeysChange}
          value={[...checkedKeys]}
        >
          <Group gap={4} wrap="wrap">
            {choices.map((choice) => (
              <Tooltip
                disabled={!choice.hint}
                key={choice.key}
                label={choice.hint}
                multiline
                openDelay={200}
                position="top"
                w={250}
                withArrow
              >
                <Checkbox
                  classNames={{
                    body: styles.choiceBody,
                    label: styles.choiceLabel,
                    root: styles.choiceRoot,
                  }}
                  disabled={loading}
                  label={choice.label}
                  size="xs"
                  value={choice.key}
                />
              </Tooltip>
            ))}
          </Group>
        </Checkbox.Group>
      ) : null}
    </ConfirmModal>
  );
};

export default DeleteConfirm;
