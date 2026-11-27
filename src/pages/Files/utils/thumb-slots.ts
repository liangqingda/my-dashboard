/**
 * 瓦片缩略图的并发闸门：同时在途的缩略图请求压到 2 条。
 *
 * 缩略图是后端现转的——视频走 QuickLook，一个要近一秒。这段时间里浏览器那一条连接是占着的，
 * 而浏览器对同一 host 只给 6 条连接：网格一次挂十几片瓦片时，6 条能被缩略图全占满，
 * 这时点开视频，它的媒体请求只能排在后面等（冷目录里就是肉眼可见的停顿）。
 * 压到 2 条之后，剩下 4 条始终留给视频与大文件接口。
 *
 * 为什么不是 0 / 4：0 等于不显示缩略图；2 已经是后端生成的上限（服务端那一层也限 2 路），
 * 再放宽只是把等待从「排队」换成「一起慢」，并不会更快。
 */

/** 同时在途的缩略图上限 */
const MAX_IN_FLIGHT = 2;

/** 正在跑的数量 */
let running = 0;
/** 排队等槽位的请求：票号 → 拿到槽位后要跑的回调（用 Map 而不是数组，数组的 push / shift 在项目规则里是禁的） */
const waiting = new Map<number, () => void>();
let nextTicket = 0;

/**
 * 借一个槽位：有空位立即返回，没有就排队。
 * 返回的释放函数幂等——图加载完、加载失败、组件卸载都可能调它，重复调用只算一次。
 */
export const takeThumbSlot = (): Promise<() => void> =>
  new Promise((resolve) => {
    const grant = (): void => {
      running += 1;

      let released = false;

      resolve(() => {
        if (released) {
          return;
        }

        released = true;
        running -= 1;

        const next = waiting.entries().next().value;

        if (next !== undefined) {
          waiting.delete(next[0]);
          next[1]();
        }
      });
    };

    if (running < MAX_IN_FLIGHT) {
      grant();

      return;
    }

    waiting.set(nextTicket, grant);
    nextTicket += 1;
  });
