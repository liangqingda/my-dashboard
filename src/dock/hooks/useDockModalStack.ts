/**
 * 弹窗登记栈：记录当前打开着的可收起弹窗，供 `⌘M` 与「图标是否激活」使用。
 * 页面弹窗与程序坞窗口都登记；最后一个是最上层。
 */

import { useRef, useState } from 'react';
import type { RefObject } from 'react';

import type { DockEntry, DockModalRegistration } from '../types';

/** 栈状态与动作 */
export type UseDockModalStackResult = {
  /** 最上层登记的弹窗 id；没有或条目已不在程序坞里时为 null */
  activeEntryId: string | null;
  /** 供 Provider 在恢复窗口前查同一 id 的页面弹窗 */
  modalStack: RefObject<DockModalRegistration[]>;
  /** 登记一扇弹窗，返回注销函数 */
  registerModal: (registration: DockModalRegistration) => () => void;
  /** 收起最上层弹窗；栈空返回 false */
  minimizeTop: () => boolean;
};

export const useDockModalStack = (
  entries: readonly DockEntry[],
): UseDockModalStackResult => {
  const modalStack = useRef<DockModalRegistration[]>([]);
  const [openModalIds, setOpenModalIds] = useState<readonly string[]>([]);

  const registerModal = (registration: DockModalRegistration) => {
    modalStack.current = [...modalStack.current, registration];

    setOpenModalIds((current) =>
      current.includes(registration.id)
        ? current
        : [...current, registration.id],
    );

    return () => {
      modalStack.current = modalStack.current.filter(
        (candidate) => candidate !== registration,
      );
      setOpenModalIds((current) =>
        current.filter((id) => id !== registration.id),
      );
    };
  };

  const minimizeTop = () => {
    const last = modalStack.current.at(-1);

    if (last === undefined) {
      return false;
    }

    last.minimize();

    return true;
  };

  /** 取最后打开的、且程序坞里有对应条目的页面弹窗 id */
  const activeEntryId =
    openModalIds.reduce<string | null>(
      (found, id) =>
        entries.some((entry) => entry.id === id) ? id : found,
      null,
    );

  return { activeEntryId, modalStack, minimizeTop, registerModal };
};
