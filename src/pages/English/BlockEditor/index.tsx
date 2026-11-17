import FreeTable from '@/components/FreeTable';

import type { MarkdownBlock } from '../types';
import { replaceAt } from '../utils/array';
import { READONLY_NOTE_ROW_LABELS } from '../constants';

import type { MarkdownBlockEditorProps } from './types';

import styles from './index.scss';

/**
 * Markdown 块级编辑器。
 *
 * 表格渲染成受控网格：单元格是文本框；行结构不在这里增删——信息表的行由记录仓库和笔记
 * 脚本按模板维护，前端加行 / 删行只会写出模板外的结构、被校验器退回。其余块保留自己的
 * 源码片段，用等宽文本框编辑。保存时由 `serializeMarkdownBlocks` 统一拼回 Markdown。
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

  /** 这一行是不是脚本同步的字段行：字段名对上名单，整行两个单元格都锁只读 */
  const isRowReadOnly = (block: MarkdownBlock, rowIndex: number): boolean => {
    if (block.type !== 'table') {
      return false;
    }

    const label = block.rows.at(rowIndex)?.cells[0]?.text ?? '';

    return READONLY_NOTE_ROW_LABELS.includes(label);
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
                {block.rows.map((row, rowIndex) => {
                  const readOnly = isRowReadOnly(block, rowIndex);

                  return (
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
                            disabled={readOnly}
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
                    </FreeTable.Tr>
                  );
                })}
              </FreeTable.Tbody>
            </FreeTable>
          </div>
        );
      })}
    </div>
  );
};

export default MarkdownBlockEditor;
