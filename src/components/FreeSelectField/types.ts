import type { SelectProps } from '@mantine/core';

/**
 * 弹层面板里的「字段组」：标题 + 下拉 + 一行口径说明。
 *
 * 只接展示与回传，选了什么、值怎么编解码都归调用方。
 */
export type FreeSelectFieldProps = {
  /** 字段标题（如「筛选范围」「时间范围」） */
  label: string;
  /** 下拉选项：只放档名，口径写在 `description`，别塞进选项把下拉撑宽 */
  data: SelectProps['data'];
  /** 当前取值 */
  value: string;
  /** 选了一档；取消选择已由组件挡掉，这里不会拿到 null */
  onChange: (value: string) => void;
  /** 这一档到底影响 / 筛掉什么：一行灰字补在下拉下面，不传则不占位 */
  description?: string;
};
