/**
 * 当前打开的笔记：按名取正文、翻篇、保存后重取、header 刷新。
 *
 * 列表只带摘要，所以「这一篇的正文」是一份独立状态：打开 / 翻篇 / 保存 / 刷新
 * 都走这一套流程，并共用同一个请求序号，连点时只认最后一次（早到的响应直接丢掉）。
 */

import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';

import type { NoteSummary, UseActiveNoteResult } from '../types';
import { fetchEnglishNote, saveEnglishNote } from '../utils/notes-api';

/** 取数失败时的兜底文案 */
const READ_ERROR_FALLBACK = '读取笔记正文失败';

/**
 * 请求快于这个时长就完全不显示加载态。
 * 弹窗本身的展开动画就要一段时间，正文若在这之前到，直接填进去比闪一下转圈更稳；
 * 只有真的慢（读盘 / 网络慢）才亮加载态，告诉用户还在等。
 */
const LOADING_DELAY_MS = 200;

/** 入参 */
type UseActiveNoteParams = {
  /** 列表里的全部摘要：打开时按名找它，拿到标题与分类归属 */
  notes: NoteSummary[];
  /** 摘要可能变了（保存后分类 / 知识点 / 时间会变），交回列表去替换那一条 */
  onSummary: (summary: NoteSummary) => void;
};

/** 两条摘要是否完全一致：一致就不用回灌列表，省一次整份看板的重算与重渲染 */
const isSameSummary = (current: NoteSummary, next: NoteSummary): boolean =>
  current.categoryKey === next.categoryKey &&
  current.topic === next.topic &&
  current.updatedAt === next.updatedAt;

/**
 * 打开一篇、取正文。
 * 先开弹窗再取：列表里没有正文可顶，等正文回来才开弹窗会有一段什么都没有的空档。
 * 取不到就明确报错并关掉弹窗，不让空弹窗冒充一篇内容。
 */
export const useActiveNote = ({
  notes,
  onSummary,
}: UseActiveNoteParams): UseActiveNoteResult => {
  const [active, setActive] = useState<NoteSummary | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** 打开请求的序号：连点两篇时只认最后一次 */
  const openSeq = useRef(0);
  /** 延迟亮加载态的计时器，切篇 / 关窗 / 卸载都要清掉 */
  const loadingTimer = useRef<number | null>(null);

  /** 取消「过一会儿亮加载态」的安排 */
  const clearLoadingTimer = useCallback(() => {
    if (loadingTimer.current !== null) {
      window.clearTimeout(loadingTimer.current);
      loadingTimer.current = null;
    }
  }, []);

  useEffect(() => clearLoadingTimer, [clearLoadingTimer]);

  /** 取当前这一篇的最新正文；摘要一起回来的话顺手回灌列表 */
  const readActive = useCallback(
    async (name: string) => {
      const body = await fetchEnglishNote(name);

      if (!body) {
        return false;
      }

      setContent(body.content);

      if (body.summary) {
        setActive(body.summary);
        onSummary(body.summary);
      }

      return true;
    },
    [onSummary],
  );

  const open = useCallback(
    async (name: string) => {
      const summary = notes.find((note) => note.name === name) ?? null;

      if (!summary) {
        return;
      }

      openSeq.current += 1;

      const seq = openSeq.current;

      setActive(summary);
      setContent(null);

      /*
       * 先不亮加载态：这段时间弹窗自己在播展开动画，正文通常也就到了。
       * 超过 LOADING_DELAY_MS 还没回来才亮，避免几十毫秒的转圈闪一下。
       */
      clearLoadingTimer();
      setLoading(false);
      loadingTimer.current = window.setTimeout(() => {
        if (seq === openSeq.current) {
          setLoading(true);
        }
      }, LOADING_DELAY_MS);

      try {
        const body = await fetchEnglishNote(name);

        if (seq !== openSeq.current) {
          return;
        }

        if (!body) {
          throw new Error('这篇笔记读不到了（可能刚被删掉）');
        }

        clearLoadingTimer();

        /*
         * 正文转成弹窗内容是一次不小的同步渲染（最长的那篇 30 KB），
         * 放进 transition 让它不跟弹窗出现抢同一帧；加载态一并在同一批结束，
         * 避免出现「转圈没了但正文还没画出来」的空档。
         */
        startTransition(() => {
          setContent(body.content);
          setLoading(false);
        });

        if (body.summary && !isSameSummary(summary, body.summary)) {
          onSummary(body.summary);
        }
      } catch (caught) {
        clearLoadingTimer();

        if (seq !== openSeq.current) {
          return;
        }

        setActive(null);
        setContent(null);
        setLoading(false);
        notifications.show({
          color: 'red',
          message: getErrorMessage(caught, READ_ERROR_FALLBACK),
        });
      }
    },
    [clearLoadingTimer, notes, onSummary],
  );

  const close = useCallback(() => {
    // 序号自增让还在路上的响应作废，别在关窗之后又把正文 / 摘要写回来
    openSeq.current += 1;
    clearLoadingTimer();
    setActive(null);
    setContent(null);
    setLoading(false);
  }, [clearLoadingTimer]);

  /**
   * 保存弹窗里的编辑：写回源文件、提交记录仓库，再只取这一篇的最新正文与摘要。
   * 重取失败不影响保存结果，下次打开会重新取。
   */
  const save = useCallback(
    async (markdown: string) => {
      if (!active) {
        return {};
      }

      const saved = await saveEnglishNote(active.name, markdown);

      try {
        await readActive(active.name);
      } catch {
        // 保存已经成功，重取失败只是这一轮没刷新到最新正文
      }

      return saved.commitError
        ? { notice: `自动提交失败：${saved.commitError}` }
        : {};
    },
    [active, readActive],
  );

  /** 弹窗 header 的刷新：只重取当前这一篇，原地更新正文与摘要 */
  const refresh = useCallback(async () => {
    if (!active) {
      return;
    }

    await readActive(active.name);
  }, [active, readActive]);

  return { active, close, content, loading, open, refresh, save };
};
