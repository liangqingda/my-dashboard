/**
 * 普通弹窗的基础外壳（前端 UI 基建）：Mantine `Modal` 加项目统一外观。
 *
 * 与 `FreeModal` 的分工：那一扇是**阅读窗**（固定 82dvh、翻篇 / 全屏 / 标题目录），
 * 这一扇是**普通对话窗**（确认、说明、短表单、列表），高度随内容、上限 88dvh、
 * 正文自己滚。两者共用同一套外观口径（框体描边、遮罩、140ms 淡入、紧凑 header、图标按钮），
 * 业务侧一律基于其中一扇封装，不再各自拼 `Modal`。
 */

import { Modal } from '@mantine/core';

import { cx } from '@/utils/cx';

import type { FreeDialogProps } from './types';

import styles from './index.scss';

/**
 * 基础弹窗外壳。业务侧只管「标题是什么、右上角放什么、正文与按钮是什么」，
 * header 的排布与关闭按钮的位置固定在这里。
 */
const FreeDialog = ({
  bodyClassName,
  centered = true,
  children,
  closeButton = true,
  closeLabel = '关闭',
  closeOnClickOutside = true,
  closeOnEscape = true,
  contentClassName,
  headerActions,
  onClose,
  opened,
  size = 'min(520px, 92vw)',
  title,
  trapFocus = true,
}: FreeDialogProps) => (
  <Modal
    centered={centered}
    classNames={{
      body: cx(styles.body, bodyClassName),
      content: cx(styles.content, contentClassName),
      header: styles.header,
      title: styles.title,
    }}
    closeButtonProps={{ 'aria-label': closeLabel }}
    closeOnClickOutside={closeOnClickOutside}
    closeOnEscape={closeOnEscape}
    onClose={onClose}
    opened={opened}
    overlayProps={{ backgroundOpacity: 0.4, blur: 2 }}
    padding={0}
    radius="md"
    size={size}
    title={
      <div
        className={cx(styles.titleRow, closeButton && styles.titleRowBeforeClose)}
      >
        <div className={styles.titleText}>{title}</div>
        {headerActions ? <div className={styles.actions}>{headerActions}</div> : null}
      </div>
    }
    transitionProps={{ duration: 140, transition: 'fade' }}
    trapFocus={trapFocus}
    withCloseButton={closeButton}
  >
    {children}
  </Modal>
);

export default FreeDialog;
