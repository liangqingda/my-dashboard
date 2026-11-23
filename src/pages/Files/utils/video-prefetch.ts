/**
 * 视频首帧预热：指针停到视频条目上时，先悄悄拉一小段文件头。
 *
 * 浏览器起播前必须先拿到容器头（mp4 的 `moov` 在前时就在这一段里），
 * 提前把这截字节放进 HTTP 缓存，点开弹窗时首帧就不用再等一次往返。
 * 只拉文件头一小段——拉整部片既浪费带宽也会和真正的播放抢连接。
 *
 * 这里只做「发一个 Range 请求」：同一路径短时间内只发一次，避免来回划过瓦片时刷请求。
 */

import { videoContentUrl } from './files-api';

/** 预取多少字节：够拿到 mp4 / webm 的头部与索引，又不至于在瓦片间乱划时把带宽吃光 */
const PREFETCH_BYTES = 512 * 1024;

/** 同一路径的预取冷却：这段时间内不再重复发请求（命中 HTTP 缓存时也省一次判断） */
const PREFETCH_COOLDOWN_MS = 60 * 1000;

/** 路径 → 上次预取的时间戳；只用作节流，过期即刷新 */
const prefetchedAt = new Map<string, number>();

/** 节流表过大时清空：一张表只服务当前的浏览会话，没有长期价值 */
const MAX_ENTRIES = 400;

/**
 * 预取某个视频的文件头。同一路径一分钟内只拉一次；失败静默——
 * 预热失败不该在界面上留下任何痕迹，真正打开时该报的错由播放器报。
 */
export const prefetchVideoHead = (pathValue: string): void => {
  const now = Date.now();
  const last = prefetchedAt.get(pathValue);

  if (last !== undefined && now - last < PREFETCH_COOLDOWN_MS) {
    return;
  }

  if (prefetchedAt.size >= MAX_ENTRIES) {
    prefetchedAt.clear();
  }

  prefetchedAt.set(pathValue, now);

  void fetch(videoContentUrl(pathValue), {
    // 走浏览器缓存：中间件给的是 `private, max-age=600`，命中时连请求都不发
    cache: 'default',
    headers: { Range: `bytes=0-${PREFETCH_BYTES - 1}` },
  })
    .then(async (response) => {
      // 必须把 body 读完，缓存才会真正留下这段字节
      if (response.ok) {
        await response.arrayBuffer();
      }
    })
    .catch(() => undefined);
};
