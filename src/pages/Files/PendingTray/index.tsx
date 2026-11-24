import { Text } from '@mantine/core';
import { IconStack2, IconX } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import { entryIcon } from '../utils/entry-icon';
import { writeDragPayload } from '../utils/drag-image';

import type { PendingTrayProps } from './types';

import styles from './index.scss';

/** 叠在标题区的那几枚图标最多画三层，再多就糊成一块 */
const MAX_LAYERS = 3;

/**
 * 待拖拽区：悬浮在列表顶部（连 header 一起盖住）的一条横条，攒好的一批条目摆在这里。
 *
 * - 拖**这块空白处**（含左侧图标堆与文案）：整批一起进移动弹窗，一次搬完；
 * - 拖**某一个小图标**：只搬它一个（一次移动会话里只带这一条）；
 * - 每个小图标 hover 才浮出叉号，点了就退出待拖拽区；右侧还有一枚「清空」。
 *
 * 攒下东西以后列表的点击语义会变（点条目＝加入 / 移除，不再打开），
 * 这条只负责展示与拖起，那份语义归 `useDragPending`。
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
  const layers = entries.slice(0, MAX_LAYERS);

  return (
    <div
      aria-hidden={hidden}
      aria-label="待拖拽区"
      className={cx(styles.tray, hidden && styles.hidden)}
      role="region"
    >
      <div
        className={styles.main}
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
        <div aria-hidden="true" className={styles.stack}>
          {layers.map((entry, index) => {
            const Icon = entryIcon(entry);

            return (
              <span
                className={styles.layer}
                key={entry.path}
                style={{
                  transform: `translate(${index * -4}px, ${index * -4}px) scale(${1 - index * 0.1})`,
                  zIndex: layers.length - index,
                }}
              >
                <Icon className={styles.layerIcon} size={20} stroke={1.2} />
              </span>
            );
          })}
        </div>
        <div className={styles.text}>
          <Text className={styles.title} size="sm">
            <IconStack2 aria-hidden="true" className={styles.titleIcon} size={14} stroke={1.8} />
            {entries.length} 项待移动
          </Text>
          <Text c="dimmed" className={styles.hint} size="xs">
            拖这块空白处搬全部，拖某个小图标只搬它
          </Text>
        </div>
      </div>

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
                // 小图标自己就是拖拽源，别让外层「整批拖」再拦一次
                event.stopPropagation();
                writeDragPayload(event.dataTransfer, [entry.path]);
                onDragEntry(entry);
              }}
            >
              <Icon aria-hidden="true" className={styles.chipIcon} size={14} stroke={1.2} />
              <FreeTruncatedText
                className={styles.chipName}
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

      <FreeIconAction
        className={styles.clear}
        label="清空待拖拽区"
        onClick={onClear}
        size="sm"
        tone="danger"
      >
        <IconX size={15} stroke={1.9} />
      </FreeIconAction>
    </div>
  );
};

export default PendingTray;
