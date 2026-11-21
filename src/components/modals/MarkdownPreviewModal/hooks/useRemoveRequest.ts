/**
 * 删除请求的两步：点 header 的删除按钮先弹二次确认，确认后才真的删。
 *
 * 为什么拆成两步：预览弹窗里的删除会真的把文档与「文档牵连的东西」一起删掉，
 * 点一下就走等于把「点错了」变成一个要回滚的麻烦。
 * 删除失败必须可见——确认层收起来、弹窗与正文留在原处，用户才知道不是按了没反应。
 */

import { useState } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';

import type { MarkdownPreviewRemove, RemoveRequestParams } from '../types';

/** 调用方给的默认勾选：choices 里标了 defaultChecked 的那些 key */
const defaultCheckedKeys = (remove?: MarkdownPreviewRemove): string[] =>
  (remove?.choices ?? [])
    .filter((choice) => choice.defaultChecked === true)
    .map((choice) => choice.key);

/** 删除请求暴露的状态与动作 */
export type RemoveRequestState = {
  /** 二次确认层是否打开 */
  confirming: boolean;
  /** 是否正在删（确认按钮的 loading，同时挡住重复点击） */
  removing: boolean;
  /** 确认层左下角勾中的 key；没有勾选项时恒为空数组 */
  checkedKeys: readonly string[];
  /** 点 header 的删除按钮：打开确认层（勾选回到调用方给的默认值） */
  request: () => void;
  /** 取消删除 */
  cancel: () => void;
  /** 确认删除：把勾中的 key 带进调用方的 `confirm` */
  confirm: () => void;
  /** 勾选集合变化 */
  setCheckedKeys: (keys: string[]) => void;
};

/**
 * 把「点按钮 → 二次确认 → 真的删」这一串收成一个 hook。
 *
 * @param remove 调用方给的删除能力；不提供时 `request` 不产生任何效果
 * @returns 确认层的开合、删除中的状态、左下角的勾选与四个动作
 */
export const useRemoveRequest = ({
  remove,
}: RemoveRequestParams): RemoveRequestState => {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  /** 左下角勾中的 key：每次打开确认层都回到调用方给的默认值，不记住上一次 */
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);

  const request = () => {
    if (remove) {
      setCheckedKeys(defaultCheckedKeys(remove));
      setConfirming(true);
    }
  };

  const cancel = () => setConfirming(false);

  const confirm = () => {
    if (!remove || removing) {
      return;
    }

    setRemoving(true);
    void Promise.resolve()
      .then(() => remove.confirm(checkedKeys))
      .catch((error: unknown) => {
        notifications.show({
          color: 'red',
          message: getErrorMessage(error, '请稍后再试'),
          title: '删除失败',
        });
      })
      .finally(() => {
        setRemoving(false);
        setConfirming(false);
      });
  };

  return {
    cancel,
    checkedKeys,
    confirm,
    confirming,
    removing,
    request,
    setCheckedKeys,
  };
};
