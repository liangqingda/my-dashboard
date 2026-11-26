/**
 * 拖到空白处、正在搬进当前这一层时的全屏遮罩入参。
 */

/** 入参：搬到第几条 / 一共几条 */
export type BlankMoveMaskProps = {
  /** 已经搬完的条数 */
  done: number;
  /** 这一批一共几条 */
  total: number;
};
