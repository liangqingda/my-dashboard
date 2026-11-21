/**
 * 子区域预览的「这次能前后切到哪几段」：链接区块与折叠块共用这一套算法。
 *
 * 传进来的不是区块本身，而是每一段的分组键（链接是 `linkGroup`、折叠块是 `groupLine`）：
 * **同键即「同一处」**，`section` 口径只在这一组里切，`all` 就是整篇。
 * 分组语义（一处目录 / 一个小节）归各自的解析器算，这里只按数字比。
 */

/**
 * 按切换口径挑出可切换的下标。
 *
 * @param groups 每一段的分组键，顺序与 `sections` 一致
 * @param currentGroup 当前这一段的分组键；null 表示认不出（退回全文）
 * @param scope 切换口径
 * @returns 可切换片段的下标，按原顺序；找不到同一组时退回全文，不让计数变成 0
 */
export const listScopePeers = (
  groups: readonly number[],
  currentGroup: number | null,
  scope: 'all' | 'section',
): number[] =>
  groups.flatMap((group, index) =>
    scope === 'all' || currentGroup === null || group === currentGroup
      ? [index]
      : [],
  );
