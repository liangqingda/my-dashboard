/**
 * 文件页把预览能力登记到 App 层：只在页面挂载期间有效，换页后程序坞窗口不再显示
 * 那些依赖页面状态的操作，而不是拿旧闭包去改一个已经卸载的页面。
 */

import { useContext, useEffect } from 'react';

import { PreviewDockActionsSetterContext } from '..';
import type { PreviewDockActions } from '../types';

export const useProvidePreviewDockActions = (
  actions: PreviewDockActions,
): void => {
  const setter = useContext(PreviewDockActionsSetterContext);

  useEffect(() => {
    setter?.(actions);
  }, [actions, setter]);

  useEffect(
    () => () => {
      setter?.(null);
    },
    [setter],
  );
};
