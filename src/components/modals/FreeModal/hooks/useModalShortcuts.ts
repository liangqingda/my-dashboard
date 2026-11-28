/**
 * 阅读类弹窗的整套键盘口径，只在这里定义一次：业务弹窗不各自补快捷键。
 *
 * - `Esc`：默认关窗（由 Mantine `Modal` 的 `closeOnEscape` 负责）；业务接管时
 *   （`onRequestEscape`，如裁剪先退模式）改在这里执行、这一下不关窗；
 * - **空格**：关窗；弹窗能收起到程序坞时改走 `onDismiss`（最小化，不关条目），
 *   给了媒体能力时改为播放 / 暂停。并 `preventDefault` 掉浏览器
 *   「空格 = 点击当前焦点按钮」的默认行为——焦点常留在 header 图标上，不拦的话按空格会莫名
 *   翻到下一条 / 切了全屏；
 * - **`[` / `【`、`]` / `】` 上一篇 / 下一篇**（有 `nav` 且没被禁用时）；
 * - **`←` / `→`**：默认同 `[` / `]` 翻篇；调用方给了 `onSeek` 时改为交给它快进 / 后退
 *   （视频里方向键要留给播放进度，翻篇只剩方括号）。程序坞窗口与页面弹窗同口径，
 *   切程序坞条目走 `⌘←` / `⌘→`（`layouts/BasicLayout`）与 header 两侧箭头，不抢内容的方向键；
 * - **`F` 全屏开关**（有全屏按钮时）；
 * - **`M` 静音开关**、**`S` 显隐面板**（视频预览的目录列）、**`Enter` 截图**：都是调用方给了动作才生效；
 * - **`C` 复制**（调用方给了复制文本时）：与 header 的复制按钮同一口径，写进剪贴板并给一条提示；
 * - **`Delete` / `Backspace` 删除**（调用方给了删除请求时）：只触发确认，不直接删。
 *   两个键都认：`Delete` 是键盘右侧的 Forward Delete，macOS 键盘上印着「delete」的那一颗
 *   发出来的是 `Backspace`，只认一个会让另一半人觉得「快捷键没反应」。
 *
 * 放行口径统一：带 ⌘ / Ctrl / Alt 的组合键归浏览器或系统；正在输入（输入框、可编辑区）
 * 时字符属于输入本身；按住不放的连发不算下一次。`disabled` 是业务侧的整组开关
 * （加载中、上层浮层开着），空格关窗另由 `closeOnSpace` 单独把关。
 *
 * 复制 / 删除之所以收进外壳，而不是留在某个业务弹窗：两处弹窗都要用同一套键位，
 * 留在一处就会出现「笔记页能用、记录详情不能用」。
 */

import { useEffect } from 'react';
import { notifications } from '@mantine/notifications';

import { COPY_FAILED_NOTICE_ID } from '@/components/buttons/CopyIconButton/constants';
import { COPY_FEEDBACK_DURATION, copyText } from '@/utils/clipboard';
import { isTypingTarget } from '@/utils/typing-target';

import type { FreeModalNav, FreeModalSeekDirection } from '../types';
import { COPY_SUCCESS_NOTICE_ID } from '../constants';

/** 上一篇的按键：中文输入法下同一个物理键打出全角方括号，两种形态都认 */
const PREVIOUS_KEYS = new Set(['[', '【']);

/** 下一篇的按键：理由同上 */
const NEXT_KEYS = new Set([']', '】']);

/** 删除键的两种形态：Forward Delete 与 macOS 键盘上的 delete（Backspace） */
const REMOVE_KEYS = new Set(['Delete', 'Backspace']);

/** 方向键 → 快进 / 后退的方向：给了 `onSeek` 之后这两个键归媒体 */
const ARROW_SEEK_DIRECTION: Record<string, FreeModalSeekDirection | undefined> = {
  ArrowLeft: 'backward',
  ArrowRight: 'forward',
};

/** 复制键 */
const COPY_KEY = 'c';

/** 静音键 */
const MUTE_KEY = 'm';

/** 截图键：回车 */
const CAPTURE_KEY = 'Enter';

/** 复制失败时固定的提示文案 */
const COPY_FAILED_MESSAGE = '复制失败，请手动复制';

/** 整套快捷键的入参 */
type ModalShortcutsParams = {
  /** 弹窗开着才吃键 */
  enabled: boolean;
  /** 整组收掉（加载中、上层浮层开着时由调用方传 true） */
  disabled: boolean;
  /** 空格是否关窗（默认跟随 Esc 的开关） */
  closeOnSpace: boolean;
  /** 关窗 */
  onClose: () => void;
  /** 空格被「收起到程序坞」接管时走它；不传则仍然关窗 */
  onDismiss?: () => void;
  /** 翻页配置；不传表示这扇窗没有翻页 */
  nav?: FreeModalNav;
  /** 切换全屏；不传表示没有全屏按钮 */
  onToggleFullscreen?: () => void;
  /** 切换播放 / 暂停；传了之后空格归媒体，不再关窗 */
  onTogglePlay?: () => void;
  /** 切换静音（`m` / `M`）；不传则该键不动作 */
  onToggleMute?: () => void;
  /** 截当前画面（`Enter`，视频预览用来存帧）；不传则该键不动作 */
  onCapture?: () => void;
  /** 方向键快进 / 后退：传了之后 ← / → 不再翻篇 */
  onSeek?: (direction: FreeModalSeekDirection) => void;
  /** 复制能力：要写进剪贴板的文本；不传表示没有复制按钮 */
  copy?: string;
  /** 复制成功的提示文案；不传用一句通用文案 */
  copyMessage?: string;
  /** 删除请求：不传表示没有删除按钮（有按钮才有这个键） */
  onRequestDelete?: (() => void) | null;
  /** Esc 的接管：给了它，Esc 只执行这个动作、不关窗 */
  onRequestEscape?: (() => void) | null;
  /**
   * 业务自己的单键动作：键名小写，值是要做的事（如 `{ c: 开合收藏面板 }`）。
   * 挂在弹窗这一套监听里、只在这扇窗开着时生效；业务侧不要再自己 `addEventListener`。
   */
  extraKeys?: Readonly<Record<string, () => void>>;
};

/** 监听空格、翻页、全屏、复制与删除键 */
export const useModalShortcuts = ({
  closeOnSpace,
  copy,
  copyMessage = '已复制到剪贴板',
  disabled,
  enabled,
  extraKeys,
  nav,
  onClose,
  onDismiss,
  onRequestDelete,
  onRequestEscape,
  onSeek,
  onToggleFullscreen,
  onCapture,
  onToggleMute,
  onTogglePlay,
}: ModalShortcutsParams): void => {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    /** 复制并给一条提示：成功走固定 id，连按不叠一屏 */
    const handleCopy = () => {
      if (copy === undefined) {
        return;
      }

      void copyText(copy).then((ok) => {
        notifications.show({
          autoClose: ok ? COPY_FEEDBACK_DURATION : false,
          color: ok ? 'teal' : 'red',
          id: ok ? COPY_SUCCESS_NOTICE_ID : COPY_FAILED_NOTICE_ID,
          message: ok ? copyMessage : COPY_FAILED_MESSAGE,
          title: ok ? '已复制' : '复制失败',
        });
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      /*
       * 整组收掉时连空格一起收：上层浮层（如删除确认）开着，
       * 底下的播放器不该还在响应「播放 / 暂停」
       */
      if (disabled) {
        return;
      }

      if (event.key === 'Escape' && onRequestEscape) {
        event.preventDefault();
        onRequestEscape();

        return;
      }

      if (event.key === ' ') {
        if (onTogglePlay) {
          event.preventDefault();
          onTogglePlay();

          return;
        }

        if (closeOnSpace) {
          event.preventDefault();

          if (onDismiss) {
            onDismiss();
          } else {
            onClose();
          }
        }

        return;
      }

      if (event.key.toLowerCase() === COPY_KEY && copy !== undefined) {
        event.preventDefault();
        handleCopy();

        return;
      }

      if (REMOVE_KEYS.has(event.key) && onRequestDelete) {
        // 拦掉 Backspace 在部分环境下的「浏览器后退」默认行为
        event.preventDefault();
        onRequestDelete();

        return;
      }

      const extra = extraKeys?.[event.key.toLowerCase()];

      if (extra !== undefined) {
        event.preventDefault();
        extra();

        return;
      }

      if (event.key.toLowerCase() === 'f' && onToggleFullscreen) {
        event.preventDefault();
        onToggleFullscreen();

        return;
      }

      if (event.key.toLowerCase() === MUTE_KEY && onToggleMute) {
        event.preventDefault();
        onToggleMute();

        return;
      }

      if (event.key === CAPTURE_KEY && onCapture) {
        event.preventDefault();
        onCapture();

        return;
      }

      // 方向键交给了媒体（视频快进 / 后退）就不再翻篇，翻篇只剩方括号
      const seekDirection = onSeek ? ARROW_SEEK_DIRECTION[event.key] : undefined;

      if (seekDirection !== undefined && onSeek) {
        event.preventDefault();
        onSeek(seekDirection);

        return;
      }

      if (nav === undefined || nav.disabled === true) {
        return;
      }

      if (
        PREVIOUS_KEYS.has(event.key) ||
        (onSeek === undefined && event.key === 'ArrowLeft')
      ) {
        if (nav.onPrevious) {
          event.preventDefault();
          nav.onPrevious();
        }

        return;
      }

      if (
        NEXT_KEYS.has(event.key) ||
        (onSeek === undefined && event.key === 'ArrowRight')
      ) {
        if (nav.onNext) {
          event.preventDefault();
          nav.onNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    closeOnSpace,
    copy,
    copyMessage,
    disabled,
    enabled,
    extraKeys,
    nav,
    onCapture,
    onClose,
    onDismiss,
    onRequestDelete,
    onRequestEscape,
    onSeek,
    onToggleFullscreen,
    onToggleMute,
    onTogglePlay,
  ]);
};
