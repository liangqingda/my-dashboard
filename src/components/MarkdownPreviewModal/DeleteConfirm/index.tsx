/**
 * 删除前的二次确认层（叠在主预览上面的一层）。
 *
 * 它只做三件事：把「删掉会发生什么」原样说一遍（文案由调用方给，组件不知道文档落在哪里）、
 * 给一组可选的「这次删什么」勾选项（同样只画 checkbox，语义在调用方），
 * 以及给两个出口——取消 / 删除。确认后真正删除的动作也在调用方手里。
 *
 * 排版上只有两段：标题区（「删除这个文档？」+ 被删文档的路径）与说明块，最后一行左边竖排勾选项、
 * 右边收着两个按钮。标题里不塞长路径：文件名一长就会把「？」挤到下一行，路径独立成一行
 * monospace 更好读。
 *
 * 勾选项一变，说明块就按调用方给的函数重算——「这次会少删哪一样」在按下删除之前就看得见。
 * 一项都没勾时没有可删的东西，删除按钮直接不可点。
 */

import { Button, Checkbox, Group, Modal, Stack, Text } from '@mantine/core';

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
    <Modal
      centered
      classNames={{
        body: styles.body,
        content: styles.content,
        header: styles.header,
        title: styles.title,
      }}
      closeButtonProps={{ 'aria-label': '关闭删除确认' }}
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
      onClose={onCancel}
      opened={opened}
      overlayProps={{ backgroundOpacity: 0.4, blur: 2 }}
      radius="md"
      size={420}
      title={
        <div>
          <Text className={styles.headTitle}>删除这个文档？</Text>
          <Text className={styles.headPath}>{title}</Text>
        </div>
      }
      transitionProps={{ duration: 140, transition: 'fade' }}
      withCloseButton={!loading}
    >
      <Text className={styles.description}>{text}</Text>
      <div className={styles.footer}>
        {/* 勾选项靠左、按钮靠右：说明可以折行，按钮组不让位（没有勾选项时按钮靠右由 .actions 兜住） */}
        {choices ? (
          <Checkbox.Group
            className={styles.choices}
            onChange={onCheckedKeysChange}
            value={[...checkedKeys]}
          >
            <Stack gap={6}>
              {choices.map((choice) => (
                <Checkbox
                  classNames={{
                    description: styles.choiceHint,
                    label: styles.choiceLabel,
                  }}
                  description={choice.hint}
                  disabled={loading}
                  key={choice.key}
                  label={choice.label}
                  size="sm"
                  value={choice.key}
                />
              ))}
            </Stack>
          </Checkbox.Group>
        ) : null}
        <Group
          className={styles.actions}
          gap="sm"
          justify="flex-end"
          wrap="nowrap"
        >
          <Button disabled={loading} onClick={onCancel} size="sm" variant="default">
            取消
          </Button>
          <Button
            className={styles.deleteButton}
            disabled={nothingChecked}
            loading={loading}
            onClick={onConfirm}
            size="sm"
          >
            删除
          </Button>
        </Group>
      </div>
    </Modal>
  );
};

export default DeleteConfirm;
