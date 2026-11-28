/**
 * 快捷命令弹窗的正文：加载 / 离线 / 失败 / 空态与分组列表。
 * 页面弹窗与程序坞后备窗口共用这一份，状态由 `useCliCommands` 交上来。
 */

import type { CliCommandsState } from '../hooks/useCliCommands';
import CommandRow from '../CommandRow';

import styles from './index.scss';

const CommandsBody = ({ agentOnline, loading, error, groups }: CliCommandsState) => {
  if (!agentOnline) {
    return <div className={styles.empty}>连接恢复后显示快捷命令。</div>;
  }

  if (loading) {
    return <div className={styles.empty}>正在读取快捷命令…</div>;
  }

  if (error) {
    return <div className={styles.empty}>读取失败：{error}</div>;
  }

  if (groups.length === 0) {
    return <div className={styles.empty}>未发现别名或函数</div>;
  }

  return (
    <div className={styles.body}>
      {groups.map((group) => (
        <div className={styles.group} key={group.key}>
          <div className={styles.groupName}>{group.label}</div>
          {group.items.map((item) => (
            <CommandRow desc={item.desc} key={item.name} name={item.name} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default CommandsBody;
