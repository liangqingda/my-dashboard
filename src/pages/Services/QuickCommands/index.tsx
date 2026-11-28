/**
 * 全局快捷命令弹窗：展示 ~/.zshrc 中的别名与函数。
 * 数据由 agent 动态解析下发（GET /api/cli-commands），
 * 打开弹窗时读取别名/函数，无需改前端代码。
 * 每行左右布局（命令 | 说明），点击命令可复制；单行组件在 CommandRow 里。
 */

import { useState } from 'react';
import { Button } from '@mantine/core';
import { IconRefresh, IconTerminal2 } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeModal from '@/components/modals/FreeModal';
import type { FreeModalDock } from '@/components/modals/FreeModal/types';

import CommandsBody from './CommandsBody';
import { useCliCommands } from './hooks/useCliCommands';

/** 这扇窗全站只有一份：稳定 id 固定，重复收起只替换同一条 */
const DOCK_ID = 'cli-commands:global';

const QUICK_COMMANDS_DOCK: FreeModalDock = {
  id: DOCK_ID,
  kind: 'cli-commands',
  origin: 'page',
  snapshot: {},
  title: '全局快捷命令',
};

/** 全局快捷命令弹窗（动态读取 ~/.zshrc） */
const QuickCommands = () => {
  const [opened, setOpened] = useState(false);
  const cli = useCliCommands(opened);

  return (
    <>
      <Button
        aria-haspopup="dialog"
        leftSection={<IconTerminal2 aria-hidden="true" size={14} />}
        onClick={() => setOpened(true)}
        size="xs"
        variant="light"
      >
        全局快捷命令
      </Button>
      <FreeModal
        closeLabel="关闭全局快捷命令"
        dock={QUICK_COMMANDS_DOCK}
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
        onClose={() => setOpened(false)}
        opened={opened}
        size="min(820px, 92vw)"
        title="全局快捷命令"
      >
        <CommandsBody {...cli} />
      </FreeModal>
    </>
  );
};

export default QuickCommands;
