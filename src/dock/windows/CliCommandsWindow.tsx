/**
 * 程序坞里的全局快捷命令窗：快照不存清单，恢复时与页面弹窗共用 `useCliCommands`
 * 重新拉取本机 shell 配置。正文组件同样复用页面那一份，不在坞窗另写一套列表。
 */

import { IconRefresh } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeModal from '@/components/modals/FreeModal';
import type { FreeModalDock } from '@/components/modals/FreeModal/types';

import CommandsBody from '@/pages/Services/QuickCommands/CommandsBody';
import { useCliCommands } from '@/pages/Services/QuickCommands/hooks/useCliCommands';

import type { DockWindowProps } from '../types';

const CliCommandsWindow = ({ entry, onRequestClose }: DockWindowProps) => {
  const cli = useCliCommands(true);

  if (entry.kind !== 'cli-commands') {
    return null;
  }

  const dock: FreeModalDock = {
    id: entry.id,
    surfaceId: entry.id,
    kind: 'cli-commands',
    origin: 'dock',
    snapshot: {},
    title: entry.title,
  };

  return (
    <FreeModal
      closeLabel="关闭全局快捷命令"
      dock={dock}
      headerActions={
        <FreeIconAction
          disabled={!cli.agentOnline || cli.loading}
          label="刷新快捷命令"
          onClick={cli.refresh}
        >
          <IconRefresh aria-hidden="true" size={18} />
        </FreeIconAction>
      }
      height="auto"
      onClose={onRequestClose}
      opened
      size="min(820px, 92vw)"
      title={entry.title}
    >
      <CommandsBody {...cli} />
    </FreeModal>
  );
};

export default CliCommandsWindow;
