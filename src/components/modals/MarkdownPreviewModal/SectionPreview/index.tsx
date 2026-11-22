/**
 * 子区域预览：把正文里的一段内容单独开窗阅读（同文档锚点指向的一节 / 折叠块里的正文）。
 *
 * 弹窗外壳统一走 `@/components/modals/FreeModal`：翻页 / 计数 / 标题 / 字号 / 全屏 / 关闭
 * 都由外壳排布，这里只给标题、字号控件与正文，并让它比主预览矮一档、全屏时四周留缝
 * （它叠在主预览上面，得看得出「底下那篇还在」）。正文排版复用主预览的样式模块。
 *
 * **「哪些段是一组」归调用方**：这里只收 `sections` 与 `peers`（能前后切到的下标），
 * 同文档锚点按 `all` / `section` 口径分组、折叠块按全文顺序分组，都是文档语义，
 * 组件不猜。翻页首尾**贯穿**——最后一页的「下一个」回到第一页、第一页的「上一个」
 * 跳到最末一页，所以两侧按钮不会因为「到头」而置灰；只有一页可切时两侧都不可点。
 * 下标越界（换篇后正文变短）时当作关着。
 *
 * 快捷键分两层：翻页（`[` / ← 上一段、`]` / → 下一段）、`F` 全屏、空格 / Esc 关窗由
 * `FreeModal` 统一接管；字号 `A` 走与主预览同一份 `useHeaderActionShortcuts`（这一层只挂
 * 字号这一个能力）。主预览在这一层开着的这段时间把整套键收掉（`shortcutsEnabled={false}`），
 * 所以两组键不会打架。
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import Markdown from 'react-markdown';

import FreeModal from '@/components/modals/FreeModal';
import { useModalFullscreen } from '@/components/modals/FreeModal/hooks/useModalFullscreen';
import { cx } from '@/utils/cx';
import type { MarkdownOutlineHeading } from '@/utils/markdown-outline';

import type { SectionPreviewProps } from '../types';
import OutlineNav from '../OutlineNav';
import ProseFontControl from '../ProseFontControl';
import {
  REHYPE_PLUGINS,
  REMARK_PLUGINS,
  sectionPreviewStorageKey,
} from '../constants';
import { useActiveHeadingIndex } from '../hooks/useActiveHeadingIndex';
import { useDocumentScrollReset } from '../hooks/useDocumentScrollReset';
import { useHeaderActionShortcuts } from '../hooks/useHeaderActionShortcuts';
import { useProseFontScale } from '../hooks/useProseFontScale';
import {
  getClickedAnchor,
  scrollToAnchor,
  scrollToHeading,
} from '../utils/prose-navigation';

import previewStyles from '../index.scss';

/** 稳定的空标题列表：没打开时目录不该因为一个新数组而重算 */
const NO_HEADINGS: MarkdownOutlineHeading[] = [];

/** 常规态框体比主预览矮一档：上面那层只盖住大半屏，底下那篇还看得见 */
const CONTENT_STYLE: CSSProperties = {
  height: '74dvh',
  maxHeight: '82dvh',
};

/** 全屏态四周留缝：它叠在主预览上面，铺满就没法分清在看哪一层 */
const FULLSCREEN_CONTENT_STYLE: CSSProperties = {
  flex: '0 0 95vw',
  width: '95vw',
  height: '95dvh',
  maxHeight: '95dvh',
};

/** 两个入口各记一套阅读偏好：锚点预览与折叠块预览互不影响 */
const SectionPreview = ({
  nextLabel = '下一个区块',
  onClose,
  onIndexChange,
  peers,
  previousLabel = '上一个区块',
  sections,
  index,
  storageScope,
  variant,
}: SectionPreviewProps) => {
  const section =
    index !== null && index < sections.length ? sections[index] : null;
  /** 当前这段在这条可切换列表里的位置；-1 表示没对上，按关着处理 */
  const cursor = index === null ? -1 : peers.indexOf(index);
  /** 能不能换到别的一段：只有一段时前后都是它自己，给了也没意义 */
  const canSwitch = cursor >= 0 && peers.length > 1;
  /** 贯穿取邻：下标回绕一圈，首尾相接（这里不用取模的负值写法，读起来更直白） */
  const previous = canSwitch
    ? peers[cursor === 0 ? peers.length - 1 : cursor - 1]
    : null;
  const next = canSwitch
    ? peers[cursor === peers.length - 1 ? 0 : cursor + 1]
    : null;

  /** 全屏与字号都是「怎么看」的偏好：按入口各记一套，换一段也不重置 */
  const storageKey = sectionPreviewStorageKey(storageScope, variant);
  const { fullscreen, toggle } = useModalFullscreen(storageKey);
  const proseFont = useProseFontScale(storageKey);
  const proseStyle = { '--prose-extra': `${proseFont.offset}px` } as CSSProperties;

  const bodyRef = useRef<HTMLElement | null>(null);
  /** 正文节点同时存一份 state：节点挂载 / 卸载时让依赖它的 effect 重建 */
  const [bodyElement, setBodyElement] = useState<HTMLElement | null>(null);
  /**
   * 字号弹层：记着它是「为哪一段」打开的，换段之后自然算作收起——
   * 用记录归属的派生状态，而不是在 effect 里 setState（那会多渲染一轮）。
   */
  const [fontPanel, setFontPanel] = useState({ key: '', opened: false });

  const headings = section ? section.headings : NO_HEADINGS;
  /**
   * header 标题：区块标题 + 它所处的那一节（上一级标题），
   * 如「本轮习题 · 2026-11-15 12:05 · 复习」——同一篇里好几轮复习时靠它分清这一段是哪一轮的。
   * 折叠块的 `parentTitle` 是空串，只显示 summary 那句话。
   */
  const heading = section
    ? [section.title || section.key, section.parentTitle].filter(Boolean).join(' · ')
    : '';

  /** 面板说的永远是「当前这一段」的字号：换段后按归属算作收起 */
  const fontOpened =
    section !== null && fontPanel.key === section.key && fontPanel.opened;

  /** 开合字号弹层，同时记下它属于哪一段 */
  const setFontOpened = (open: boolean) => {
    setFontPanel({ key: section ? section.key : '', opened: open });
  };

  /** 快捷键开合字号面板：已开就收起，否则打开（与点字号按钮同一条路） */
  const toggleFontPanel = useCallback(() => {
    setFontPanel((current) => ({
      key: section ? section.key : '',
      opened:
        section !== null && !(current.key === section.key && current.opened),
    }));
  }, [section]);

  /** 正文只随这一段重建：`react-markdown` 每次渲染都要重新解析整段 */
  const bodyContent = useMemo(
    () =>
      section ? (
        <Markdown rehypePlugins={REHYPE_PLUGINS} remarkPlugins={REMARK_PLUGINS}>
          {section.markdown}
        </Markdown>
      ) : null,
    [section],
  );

  /** 滚动正文时跟踪当前小节，供这一段自己的目录高亮 */
  const activeIndex = useActiveHeadingIndex({
    container: bodyElement,
    enabled: section !== null,
    headings,
  });

  /** 换段时正文回到顶部：上一段读到一半的位置不该留给下一段 */
  useDocumentScrollReset(bodyRef, section ? section.key : '', section !== null);

  /**
   * 字号快捷键 `A`：与主预览同一套键位。筛选 / 复制 / 刷新这些能力这一层没有，
   * hook 按回调可选挂接，不传的按键不动作；翻篇与 `F` 全屏归外壳 `FreeModal`。
   */
  useHeaderActionShortcuts({
    enabled: section !== null,
    onToggleFont: toggleFontPanel,
  });

  /**
   * 正文节点的 callback ref：ref 对象给需要即时读取的地方用，
   * state 负责在节点挂载 / 卸载时触发依赖它的 effect 重建。
   * 必须是稳定引用——每次渲染换一个新函数会让 React 反复卸载 / 重挂这个 ref。
   */
  const attachBody = useCallback((node: HTMLElement | null) => {
    bodyRef.current = node;
    setBodyElement(node);
  }, []);

  /**
   * 这一层里的同文档锚点：只在这一段内部跳，不再往下开第三层弹窗。
   * 拦下来是必需的——否则点一下会把地址栏改成 `#…`。
   *
   * 这一段里的折叠块不归这里管：它们按浏览器默认行为原地展开，
   * 同一份点击里不会再叠一层预览。
   */
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    const anchor = getClickedAnchor(event.target);

    if (!anchor) {
      return;
    }

    event.preventDefault();
    scrollToAnchor(bodyRef.current, anchor);
  };

  /**
   * 切换的 `[` / `]` 与 ← / → 不在这里监听：`FreeModal` 按 `nav` 统一接管，
   * 关了自然就把按键还给底下的翻篇。
   */

  return (
    <FreeModal
      closeLabel="关闭区块预览"
      /* 字号面板开着时 Esc 只收面板，不连这一层预览一起关（与主预览同一口径） */
      closeOnEscape={!fontOpened}
      contentStyle={fullscreen ? FULLSCREEN_CONTENT_STYLE : CONTENT_STYLE}
      fullscreen={{ active: fullscreen, onToggle: toggle }}
      headerActions={
        <ProseFontControl
          onChange={setFontOpened}
          opened={fontOpened}
          scale={proseFont}
          shortcut="A"
        />
      }
      nav={
        cursor < 0
          ? undefined
          : {
              index: cursor + 1,
              nextLabel,
              onNext: next === null ? null : () => onIndexChange(next),
              onPrevious: previous === null ? null : () => onIndexChange(previous),
              previousLabel,
              total: peers.length,
            }
      }
      onClose={onClose}
      opened={section !== null}
      size="min(880px, 88vw)"
      title={heading}
    >
      {/* 工作区与主预览同一套：左侧目录占一列、右侧正文各自滚动 */}
      <div className={previewStyles.workspace}>
        <OutlineNav
          activeIndex={activeIndex}
          disabled={section === null}
          fullscreen={fullscreen}
          headings={headings}
          onSelect={(headingIndex) => scrollToHeading(bodyRef.current, headingIndex)}
          storageKey={storageKey}
        />
        <div className={previewStyles.pane}>
          {section ? (
            <article
              className={cx(
                previewStyles.prose,
                fullscreen && previewStyles.proseFullscreen,
              )}
              onClick={handleClick}
              ref={attachBody}
              style={proseStyle}
            >
              {bodyContent}
            </article>
          ) : null}
        </div>
      </div>
    </FreeModal>
  );
};

export default SectionPreview;
