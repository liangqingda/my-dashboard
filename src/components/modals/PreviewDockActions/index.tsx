/**
 * 预览能力桥：页面挂载时登记，程序坞窗口按当前条目的 id 调用。
 * Provider 挂在 App 层，所以在程序坞窗口与页面之间只有这一份运行期能力。
 */

import { createContext, useState } from 'react';
import type { ReactNode } from 'react';

import type { PreviewDockActions } from './types';

/** 当前登记的能力；没有页面挂载时为 null */
export const PreviewDockActionsContext =
  createContext<PreviewDockActions | null>(null);

/** 登记 / 注销能力；页面卸载时会传 null */
export type PreviewDockActionsSetter = (
  actions: PreviewDockActions | null,
) => void;

export const PreviewDockActionsSetterContext =
  createContext<PreviewDockActionsSetter | null>(null);

type PreviewDockActionsProviderProps = {
  children: ReactNode;
};

const PreviewDockActionsProvider = ({
  children,
}: PreviewDockActionsProviderProps) => {
  const [actions, setActions] = useState<PreviewDockActions | null>(null);

  return (
    <PreviewDockActionsSetterContext.Provider value={setActions}>
      <PreviewDockActionsContext.Provider value={actions}>
        {children}
      </PreviewDockActionsContext.Provider>
    </PreviewDockActionsSetterContext.Provider>
  );
};

export default PreviewDockActionsProvider;
