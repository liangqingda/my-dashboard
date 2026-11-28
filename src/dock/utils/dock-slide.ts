/**
 * 程序坞内换窗的方向：按条目在程序坞里的先后算，往后点就向左滑，往前点就向右滑。
 */

import type { DockSlideDirection } from './dock-motion';

type OrderedEntry = {
  id: string;
};

export const slideDirectionOf = (
  entries: readonly OrderedEntry[],
  fromId: string,
  toId: string,
): DockSlideDirection => {
  const from = entries.findIndex((entry) => entry.id === fromId);
  const to = entries.findIndex((entry) => entry.id === toId);

  return to >= 0 && from >= 0 && to < from ? 'prev' : 'next';
};
