import { useEffect, useState } from 'react';
import { Button, Text, UnstyledButton } from '@mantine/core';
import { IconGripVertical, IconStack2 } from '@tabler/icons-react';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import { entryIcon } from '../utils/entry-icon';
import { hasDragPaths, readDragPaths, writeDragPayload } from '../utils/drag-image';

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
 * - **除 header 外整块都是热区**：拖这块区域 = 整批进移动弹窗，不要求落在空白处；
 * - **收：从列表拖过来的条目**在板上松手就收进来（拖拽进行中整块亮成落点）；
 * - **点某一项**：当场移出待拖拽区（不挂 hover 叉号，也不支持单独拖它）；
 * - 顶部右侧一枚「清空」。
 *
 * 攒下东西以后列表的点击 / 拖拽语义会变（点条目＝加入 / 移出、拖条目先往这儿拖），
 * 这条只负责展示、收件与整批拖起；那份语义归 `useDragPending`。位置实测侧栏那列
 * （`#main-navigation`），侧栏宽度 / 折叠状态变了也跟着走；量不到时退回 AppShell 的默认尺寸。
 */
const PendingTray = ({
  entries,
  armed = false,
  hidden = false,
  onClear,
  onDragAll,
  onDragEnd,
  onDropPaths,
  landingPath = null,
  onRemove,
  onSelectAll,
  closed = false,
}: PendingTrayProps) => {
  const [rect, setRect] = useState<SidebarRect | null>(null);
  /** 正有东西拖在板上（拖拽经过），用于给整块加一圈落点边 */
  const [over, setOver] = useState(false);

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

  /** 整块的落点态：列表正拖过来（`armed`）或指针正压在板上（`over`）都算 */
  const dropActive = armed || over;

  return (
    <div
      aria-hidden={hidden || closed}
      aria-label="待拖拽区"
      className={cx(
        styles.tray,
        hidden && styles.hidden,
        dropActive && styles.armed,
        closed && styles.closed,
      )}
      onDragEnter={() => setOver(true)}
      onDragLeave={(event) => {
        // 在面板内部从一块挪到另一块不算离开；真出了面板才收高亮
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
          return;
        }

        setOver(false);
      }}
      onDragOver={(event) => {
        const { dataTransfer } = event;

        if (!hasDragPaths(dataTransfer)) {
          return;
        }

        event.preventDefault();
        dataTransfer.dropEffect = 'move';
        setOver(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);

        const paths = readDragPaths(event.dataTransfer);

        if (paths.length > 0) {
          onDropPaths(paths);
        }
      }}
      role="region"
      style={rect ?? undefined}
    >
      <div className={styles.head}>
        <Text className={styles.title} size="sm">
          <IconStack2 aria-hidden="true" className={styles.titleIcon} size={14} stroke={1.8} />
          {entries.length} 项待移动
        </Text>
      </div>

      <div className={styles.main} data-pending-drop="true">
        <div className={styles.chips}>
          {entries.map((entry) => {
            const Icon = entryIcon(entry);

            return (
              <UnstyledButton
                aria-label={`从待拖拽区移除 ${entry.name}`}
                className={cx(styles.chip, entry.path === landingPath && styles.landing)}
                data-pending-chip={entry.path}
                key={entry.path}
                onClick={(event) =>
                  onRemove(entry, event.currentTarget.getBoundingClientRect())
                }
              >
                <Icon aria-hidden="true" className={styles.chipIcon} size={15} stroke={1.2} />
                <FreeTruncatedText
                  className={styles.chipName}
                  disabled
                  ellipsis="end"
                  text={entry.name}
                />
              </UnstyledButton>
            );
          })}
        </div>
      </div>

      <div className={styles.foot}>
        <Button
          className={styles.dragAll}
          draggable
          fullWidth
          leftSection={<IconGripVertical size={16} stroke={1.6} />}
          onDragEnd={() => {
            setOver(false);
            onDragEnd();
          }}
          onDragStart={(event) => {
            writeDragPayload(
              event.dataTransfer,
              entries.map((entry) => entry.path),
            );
            onDragAll();
          }}
          variant="filled"
        >
          拖拽全部
        </Button>
        <div className={styles.footRow}>
          <Button flex={1} onClick={onSelectAll} size="xs" variant="default">
            选择全部
          </Button>
          <Button flex={1} onClick={onClear} size="xs" variant="subtle">
            取消
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PendingTray;
