/**
 * 「从文件夹里回去」那一趟飞行的入参：起点是那格瓦片此刻的矩形，终点是手卡里的一格。
 */

/** 一个矩形（只要视口坐标与宽高，`DOMRect` 也满足这个形状） */
export type FlyRect = {
  /** 左边 */
  left: number;
  /** 上边 */
  top: number;
  /** 宽 */
  width: number;
  /** 高 */
  height: number;
};

/** 回流动画的入参 */
export type ReturnFlyProps = {
  /** 这一趟：被拿走的那格瓦片的拷贝、起点矩形、终点矩形 */
  flight: {
    /** 瓦片的深拷贝（贴在飞行块里，落成前就是它的样子） */
    node: HTMLElement;
    /** 起点：那格瓦片此刻的矩形 */
    from: FlyRect;
    /** 终点：手卡里那一格（只回来一小块，不求精确） */
    to: FlyRect;
  };
  /** 播完（或不需要播）时收掉这一层 */
  onDone: () => void;
};
