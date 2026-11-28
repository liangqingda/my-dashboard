/**
 * 读取文件页登记进程序坞的预览能力；页面没挂载时返回 null。
 */

import { useContext } from 'react';

import { PreviewDockActionsContext } from '..';

export const usePreviewDockActions = () => useContext(PreviewDockActionsContext);
