/**
 * 隐藏浏览器自带的拖拽影像：真正的「拖拽物」由页面里的 `DragGhost` 画，
 * 自带的那张半透明快照会和它叠在一起、还带一圈白边，两边都看不清。
 */

/** 复用同一枚 1px 透明方块：每次 dragstart 都新建一个节点是白占 DOM */
let transparentChip: HTMLDivElement | null = null;

/** 把拖拽影像换成透明像素（必须在 `dragstart` 里、同步调用才生效） */
export const hideNativeDragImage = (dataTransfer: DataTransfer) => {
  if (transparentChip === null) {
    transparentChip = document.createElement('div');
    transparentChip.style.cssText =
      'position:fixed;top:-100px;left:-100px;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.append(transparentChip);
  }

  dataTransfer.setDragImage(transparentChip, 0, 0);
};

/**
 * 这趟拖拽带的是不是「条目路径」载荷。
 * 拖拽经过（`dragover`）阶段浏览器不让读 `getData` 的具体内容（安全限制，只有 `drop` 时能读），
 * 所以只看 `types`：要 `preventDefault` 才能收到 `drop`，这一步不能等真去读内容。
 */
export const hasDragPaths = (dataTransfer: DataTransfer): boolean => {
  if (dataTransfer.types.includes('text/plain')) {
    return true;
  }

  // 部分浏览器把自定义类型也报成小写；统一按小写比一次，只认这一条口径
  return dataTransfer.types.some((type) => type.toLowerCase() === 'text/plain');
};

/** 读回拖拽载荷里的路径：按换行拆开、去掉空行 */
export const readDragPaths = (dataTransfer: DataTransfer): string[] =>
  dataTransfer
    .getData('text/plain')
    .split('\n')
    .map((path) => path.trim())
    .filter(Boolean);

/** 拖拽的载荷：路径用换行分隔，多个条目时下游按行拆开 */
export const writeDragPayload = (dataTransfer: DataTransfer, paths: string[]) => {
  // 参数本身是浏览器的对象，只读它、不在参数上赋值：借一个本地名字落这三笔写
  const payload = dataTransfer;

  payload.effectAllowed = 'move';
  payload.setData('text/plain', paths.join('\n'));
  hideNativeDragImage(payload);
};
