/**
 * 剪贴板：优先用异步 Clipboard API，不可用时退回 execCommand。
 *
 * 不用 `@mantine/hooks` 的 `useClipboard`：它是 hook 形态，`copy` 不返回结果（成败要靠
 * `copied` / `error` 状态再读一轮），没有 `execCommand` 兜底（`navigator.clipboard` 缺失
 * 就直接报错），复位时长也写死 2000ms。这里要的是「同步拿 boolean + 全站统一
 * `COPY_FEEDBACK_DURATION` + 非安全上下文也能复制」，三者都不重合，见 `docs/dependencies.md`。
 */

/** 复制成功后「已复制 / 对勾」反馈的停留时长（毫秒）：各处的复制入口共用同一档手感 */
export const COPY_FEEDBACK_DURATION = 1500;

/**
 * 把文本写进系统剪贴板，成功返回 true。
 * 非安全上下文（http、旧浏览器）里 Clipboard API 不可用，退回隐藏 textarea + execCommand。
 */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);

    return true;
  } catch {
    // 权限被拒或非安全上下文：走下面的兜底
  }

  const textarea = document.createElement('textarea');

  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
};
