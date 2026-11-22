/**
 * 就地改名瓦片：文件夹图标下方挂一个输入框，初始值为当前名并全选；
 * 回车 / 失焦提交，Esc 取消。改名成功与否由页面层收口，这里只采集输入与键位。
 */

import { useRef, useState } from 'react';
import { IconFolderFilled } from '@tabler/icons-react';

import FreeInput from '@/components/fields/FreeInput';

import type { RenameTileProps } from './types';

import styles from './index.scss';

const RenameTile = ({ name, onCancel, onCommit }: RenameTileProps) => {
  const [value, setValue] = useState(name);
  /** 提交 / 取消只生效一次：回车后组件卸载还会再触发失焦，不能发第二次请求 */
  const settled = useRef(false);

  const settle = (action: () => void) => {
    if (settled.current) {
      return;
    }

    settled.current = true;
    action();
  };

  /** 提交：空名或未改动按取消处理；改动交回页面层调重命名接口 */
  const commit = () => {
    const next = value.trim();

    if (next && next !== name) {
      settle(() => onCommit(next));
    } else {
      settle(onCancel);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      settle(onCancel);
    }
  };

  return (
    <div className={styles.tile}>
      <IconFolderFilled
        aria-hidden="true"
        className={styles.icon}
        size={48}
        stroke={1.2}
      />
      <FreeInput
        ariaLabel="文件夹名称"
        autoFocus
        onBlur={commit}
        onChange={setValue}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={handleKeyDown}
        value={value}
        width="100%"
      />
    </div>
  );
};

export default RenameTile;
