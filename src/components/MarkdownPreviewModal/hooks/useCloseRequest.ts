/**
 * 关闭请求的分流：编辑态（含草稿预览）一律不关，只给一条「先退出编辑」的提示；
 * 其余状态照常关（全屏也由调用方的 onClose 一并退出）。
 *
 * 为什么必须有提示：编辑态不渲染关闭按钮，Esc / 点遮罩若既不关、也没有任何反馈，
 * 看起来就是组件失灵，而不是「这一步不让关」。
 */

import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';

import type { CloseRequestParams } from '../types';
import {
  CLOSE_BLOCKED_EDITING_MESSAGE,
  CLOSE_BLOCKED_NOTIFICATION_ID,
  CLOSE_BLOCKED_PREVIEWING_MESSAGE,
} from '../constants';

/**
 * 关闭请求的处理函数：被拦时弹提示（固定 id，连按 Esc 只刷新同一条），否则执行关闭。
 *
 * @returns 递给 Modal 的 `onClose`（关闭按钮、Esc、点遮罩共用这一个入口）
 */
export const useCloseRequest = ({
  blocking,
  previewing,
  onClose,
}: CloseRequestParams): (() => void) =>
  useCallback(() => {
    if (blocking) {
      notifications.show({
        id: CLOSE_BLOCKED_NOTIFICATION_ID,
        color: 'orange',
        message: previewing
          ? CLOSE_BLOCKED_PREVIEWING_MESSAGE
          : CLOSE_BLOCKED_EDITING_MESSAGE,
        title: '编辑中不能关闭预览',
      });

      return;
    }

    onClose();
  }, [blocking, onClose, previewing]);
