import type { CSSProperties, RefObject } from 'react';

/** 画面的倍率与位移（位移相对舞台中心，单位 px） */
export type StageView = {
  scale: number;
  x: number;
  y: number;
};

/** 图片舞台的放大 / 缩小与平移入参 */
export type UseImageZoomPanOptions = {
  /** 图片能不能改倍率：加载中、读不出来、进入裁剪时传 false（捏合仍会拦掉整页缩放，只是不动画面） */
  enabled: boolean;
  /** 外部已经持有图片节点时传进来（裁剪要量同一张图、按它编码），不传则 hook 自己建 */
  imageRef?: RefObject<HTMLImageElement | null>;
};

/** 图片舞台的放大 / 缩小与平移结果 */
export type UseImageZoomPanResult = {
  /** 舞台根节点：滚轮 / 捏合监听挂在它身上 */
  stageRef: RefObject<HTMLDivElement | null>;
  /** 图片节点：量未缩放的布局尺寸，并承接位移与缩放 */
  imageRef: RefObject<HTMLImageElement | null>;
  /** 图片的 transform：缩放原点固定在图片中心，与舞台中心重合 */
  imageStyle: CSSProperties;
  /** 回到 1 倍、位移清零（进入裁剪前复位，免得选框压在缩放后的画面上） */
  reset: () => void;
};
