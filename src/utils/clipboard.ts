/**
 * 剪贴板：优先用异步 Clipboard API，不可用时退回 execCommand。
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
