import { useEffect, useState } from 'react';
import { Text } from '@mantine/core';
import { IconStack2, IconX } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import { entryIcon } from '../utils/entry-icon';
import { writeDragPayload } from '../utils/drag-image';

import type { PendingTrayProps } from './types';

import styles from './index.scss';

/**
 * 量到的侧栏矩形：待拖拽区整块盖上去，不留缝、也不压过内容区。
 * 量不到（窄屏侧栏收起）就不给内联样式，退回样式表里的兜底尺寸（顶栏之下 + AppShell 默认宽度）。
 */
type SidebarRect = { left: number; top: number; width: number; height: number };

/**
 * 待拖拽区：整块盖住左侧栏（导航那一列，顶栏之下）的一条面板，攒好的一批条目竖着排在里面。
 *
 * - 拖**面板的空白处**（条目列表下面的区域）：整批一起进移动弹窗，一次搬完；
 * - 拖**某一条**：只搬它一个（会话收窄到这一条，其余继续留在面板里）；
 * - 每条 hover 才浮出叉号，点了就退出待拖拽区；顶部右侧还有一枚「清空」。
 *
 * 攒下东西以后列表的点击语义会变（点条目＝加入 / 移除，不再打开），
 * 这条只负责展示与拖起，那份语义归 `useDragPending`。位置实测侧栏那列（`#main-navigation`），
 * 侧栏宽度 / 折叠状态变了也跟着走；量不到（比如窄屏侧栏收起）时退回 AppShell 的默认尺寸。
 */
const PendingTray = ({
  entries,
  hidden = false,
  onClear,
  onDragAll,
  onDragEnd,
  onDragEntry,
  onRemove,
}: PendingTrayProps) => {
  const [rect, setRect] = useState<SidebarRect | null>(null);

  useEffect(() => {
    const measure = () => {
      const nav = document.getElementById('main-navigation');

      if (nav === null) {
        return;
      }

      const box = nav.getBoundingClientRect();

      setRect({ height: box.height, left: box.left, top: box.top, width: box.width });
    };

    measure();
    window.addEventListener('resize', measure);

    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div
      aria-hidden={hidden}
      aria-label="待拖拽区"
      className={cx(styles.tray, hidden && styles.hidden)}
      role="region"
      style={rect ?? undefined}
    >
      <div className={styles.head}>
        <Text className={styles.title} size="sm">
          <IconStack2 aria-hidden="true" className={styles.titleIcon} size={14} stroke={1.8} />
          {entries.length} 项待移动
        </Text>
        <FreeIconAction label="清空待拖拽区" onClick={onClear} size="xs" tone="danger">
          <IconX size={14} stroke={1.9} />
        </FreeIconAction>
      </div>

      <div
        className={styles.main}
        data-pending-drop="true"
        draggable
        onDragEnd={onDragEnd}
        onDragStart={(event) => {
          writeDragPayload(
            event.dataTransfer,
            entries.map((entry) => entry.path),
          );
          onDragAll();
        }}
      >
        <div className={styles.chips}>
          {entries.map((entry) => {
            const Icon = entryIcon(entry);

            return (
              <div
                className={styles.chip}
                draggable
                key={entry.path}
                onDragEnd={onDragEnd}
                onDragStart={(event) => {
                  // 这一条自己就是拖拽源：别让外层「整批拖」再拦一次
                  event.stopPropagation();
                  writeDragPayload(event.dataTransfer, [entry.path]);
                  onDragEntry(entry);
                }}
              >
                <Icon aria-hidden="true" className={styles.chipIcon} size={15} stroke={1.2} />
                <FreeTruncatedText
                  className={styles.chipName}
                  disabled
                  ellipsis="end"
                  text={entry.name}
                />
                <FreeIconAction
                  className={styles.chipRemove}
                  label={`从待拖拽区移除 ${entry.name}`}
                  onClick={() => onRemove(entry.path)}
                  size="xs"
                >
                  <IconX size={12} stroke={1.9} />
                </FreeIconAction>
              </div>
            );
          })}
        </div>

        <Text c="dimmed" className={styles.hint} size="xs">
          拖这块空白处搬全部，拖某一条只搬它
        </Text>
      </div>
    </div>
  );
};

export default PendingTray;
