/**
 * 文件页安全锁的会话态：本次停留是否已经输对过密码。
 *
 * 只留在会话内，不做页面级持久化——离开再回来就该重新问一次，这才是「锁」的意思。
 * 密码原样比对（不做任何强度 / 格式限制），比对放这里，省得页面里再写一遍。
 */

import { useState } from 'react';

export const useFilesLock = (lockEnabled: boolean, lockPassword: string) => {
  const [unlocked, setUnlocked] = useState(false);

  /** 锁开着、密码也设了、这次还没对上：就只给密码窗 */
  const locked = lockEnabled && lockPassword !== '' && !unlocked;

  /** 校验一次：对上了记下已解锁并返回 true，窗口自己收 */
  const unlock = (password: string) => {
    if (password !== lockPassword) {
      return false;
    }

    setUnlocked(true);

    return true;
  };

  return { locked, unlock };
};
