import { UnstyledButton } from '@mantine/core';

import FreeTable from '@/components/FreeTable';

import type { MarkdownBlock } from '../types';
import { replaceAt } from '../utils/array';
import { createBlockId } from '../utils/markdown-blocks';

import type { MarkdownBlockEditorProps } from './types';

import styles from './index.scss';

/**
 * Markdown 块级编辑器。
 *
 * 表格渲染成受控网格：单元格是文本框，每行可删（至少留一行），表尾可加行；
 * 其余块保留自己的源码片段，用等宽文本框编辑。保存时由 `serializeMarkdownBlocks`
 * 统一拼回 Markdown，因此不会出现 DOM 反向序列化的结构丢失。
 */
const MarkdownBlockEditor = ({ blocks, onChange }: MarkdownBlockEditorProps) => {
  const updateBlock = (blockIndex: number, block: MarkdownBlock) => {
    onChange(replaceAt(blocks, blockIndex, block));
  };

  /** 改某张表的一个单元格 */
  const updateCell = (
    blockIndex: number,
    rowIndex: number,
    cellIndex: number,
    text: string,
  ) => {
    const block = blocks[blockIndex];

    if (block.type !== 'table') {
      return;
    }

    const row = block.rows.at(rowIndex);
    const cell = row?.cells.at(cellIndex);

    if (!row || !cell) {
      return;
    }

    const cells = replaceAt(row.cells, cellIndex, { ...cell, text });

    updateBlock(blockIndex, {
      ...block,
      rows: replaceAt(block.rows, rowIndex, { ...row, cells }),
    });
  };

  /** 表尾加一行：沿用首行的列结构 */
  const addRow = (blockIndex: number) => {
    const block = blocks[blockIndex];

    if (block.type !== 'table') {
      return;
    }

    const firstRow = block.rows.at(0);

    if (!firstRow) {
      return;
    }

    const cells = firstRow.cells.map((cell) => ({
      ...cell,
      id: createBlockId(),
      text: '',
    }));

    updateBlock(blockIndex, {
      ...block,
      rows: [...block.rows, { cells, id: createBlockId() }],
    });
  };

  /** 删一行；只剩一行时不允许删 */
  const removeRow = (blockIndex: number, rowIndex: number) => {
    const block = blocks[blockIndex];

    if (block.type !== 'table' || block.rows.length <= 1) {
      return;
    }

    updateBlock(blockIndex, {
      ...block,
      rows: block.rows.filter((_, index) => index !== rowIndex),
    });
  };

  return (
    <div className={styles.editor}>
      {blocks.map((block, blockIndex) => {
        if (block.type === 'text') {
          return (
            /*
             * 块源码文本框保留原生 textarea：要按源码行数定高、贴住编辑器栅格排，
             * Mantine Textarea 的 root 容器与尺寸体系在这里全部要覆盖
             */
            <textarea
              className={styles.textArea}
              data-block-index={blockIndex}
              key={block.id}
              onChange={(event) =>
                updateBlock(blockIndex, {
                  ...block,
                  source: event.currentTarget.value,
                })
              }
              rows={Math.max(2, block.source.split('\n').length)}
              spellCheck={false}
              value={block.source}
            />
          );
        }

        return (
          <div
            className={styles.tableBlock}
            data-block-index={blockIndex}
            key={block.id}
          >
            <FreeTable className={styles.table} compact>
              <FreeTable.Tbody>
                {block.rows.map((row, rowIndex) => (
                  <FreeTable.Tr key={row.id}>
                    {row.cells.map((cell, cellIndex) => (
                      <FreeTable.Td
                        className={cell.tag === 'th' ? styles.headCell : undefined}
                        key={cell.id}
                      >
                        {/* 单元格输入框保留原生 input：Mantine TextInput 会套一层 root 容器
                            并带上自己的高度 / 内边距体系，在这里要全部覆盖，不如直接贴合格子 */}
                        <input
                          aria-label={`第 ${rowIndex + 1} 行第 ${cellIndex + 1} 列`}
                          className={styles.cellInput}
                          onChange={(event) =>
                            updateCell(
                              blockIndex,
                              rowIndex,
                              cellIndex,
                              event.currentTarget.value,
                            )
                          }
                          value={cell.text}
                        />
                      </FreeTable.Td>
                    ))}
                    <FreeTable.Td className={styles.rowTools}>
                      <UnstyledButton
                        aria-label="删除这一行"
                        className={styles.rowRemove}
                        disabled={block.rows.length <= 1}
                        onClick={() => removeRow(blockIndex, rowIndex)}
                        type="button"
                      >
                        ×
                      </UnstyledButton>
                    </FreeTable.Td>
                  </FreeTable.Tr>
                ))}
              </FreeTable.Tbody>
            </FreeTable>
            <UnstyledButton
              className={styles.addRow}
              onClick={() => addRow(blockIndex)}
              type="button"
            >
              ＋ 添加一行
            </UnstyledButton>
          </div>
        );
      })}
    </div>
  );
};

export default MarkdownBlockEditor;
