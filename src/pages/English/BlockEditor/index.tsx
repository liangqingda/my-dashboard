import type { MarkdownBlock } from '../utils/markdown-blocks';

import styles from './index.scss';

export type MarkdownBlockEditorProps = {
  /** 解析后的块列表 */
  blocks: MarkdownBlock[];
  /** 块列表变化时回调，交给调用方持有状态 */
  onChange: (blocks: MarkdownBlock[]) => void;
};

/** 替换数组某一项，不原地修改 */
const replaceAt = <T,>(list: T[], index: number, item: T): T[] =>
  list.map((entry, entryIndex) => (entryIndex === index ? item : entry));

let seed = 0;

/** 编辑期间新增行 / 单元格的稳定 id */
const createId = (): string => {
  seed += 1;

  return `edit-${seed}`;
};

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
      id: createId(),
      text: '',
    }));

    updateBlock(blockIndex, {
      ...block,
      rows: [...block.rows, { cells, id: createId() }],
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
            <textarea
              className={styles.textArea}
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
          <div className={styles.tableBlock} key={block.id}>
            <table className={styles.table}>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={row.id}>
                    {row.cells.map((cell, cellIndex) => (
                      <td
                        className={cell.tag === 'th' ? styles.headCell : undefined}
                        key={cell.id}
                      >
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
                      </td>
                    ))}
                    <td className={styles.rowTools}>
                      <button
                        aria-label="删除这一行"
                        className={styles.rowRemove}
                        disabled={block.rows.length <= 1}
                        onClick={() => removeRow(blockIndex, rowIndex)}
                        type="button"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              className={styles.addRow}
              onClick={() => addRow(blockIndex)}
              type="button"
            >
              ＋ 添加一行
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default MarkdownBlockEditor;
