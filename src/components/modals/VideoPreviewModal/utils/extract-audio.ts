/**
 * 把一个浏览器能播的视频抽出音轨，封装成 WebM（Opus）。
 *
 * 解码走 `decodeAudioData`、编码走 WebCodecs 的 `AudioEncoder`、封装交给 `webm-muxer`。
 * 不走 `MediaRecorder`：那种做法导出多久等于把片子放多久（小时级的视频等于等一小时），
 * WebCodecs 是一次性编码，通常几秒到几十秒就完。
 *
 * 只认浏览器解得动的容器（mp4 / mov / webm 这些常见；mkv / avi 多数解不动），
 * 解不动、或片子本来就没有音轨时抛可读原因，由调用方提示改用外部播放器。
 */

import { ArrayBufferTarget, Muxer } from 'webm-muxer';

/** Opus 的编码采样率只认这一档（或它的整数分之一），解码阶段先统一重采样到这里 */
const SAMPLE_RATE = 48000;

/** 最多保留双声道：单声道片子仍按单声道封装，不白撑一倍体积 */
const MAX_CHANNELS = 2;

/** 目标码率（bit/s）：96k 的 Opus 是「听不出损」的常用档 */
const BIT_RATE = 96000;

/** 一帧 20ms = 960 个采样，与 Opus 的默认帧长对齐 */
const FRAME_SAMPLES = 960;

/** 编码队列的积压上限：超过就先让出事件循环，别让未消费的帧堆在内存里 */
const MAX_QUEUED_FRAMES = 8;

/** 抽音频的可选参数 */
export type ExtractAudioOptions = {
  /** 进度回调（0–1）：按已交给编码器的采样帧算 */
  onProgress?: (ratio: number) => void;
  /** 取消信号：关窗 / 换片时可以让它停下来 */
  signal?: AbortSignal;
};

/** 把视频字节读全：视频与预览同一路 Range 接口，这里整份取回用于解码 */
const readVideoBytes = async (
  src: string,
  signal?: AbortSignal,
): Promise<ArrayBuffer> => {
  const response = await fetch(src, signal ? { signal } : undefined);

  if (!response.ok) {
    throw new Error(`读取视频失败（HTTP ${response.status}）`);
  }

  return response.arrayBuffer();
};

/**
 * 解码音轨：上下文按 48k 建，`decodeAudioData` 会顺手把采样率重采样到目标值。
 * 浏览器解不动的容器会在这里抛 `EncodingError`，没有音轨的片子同样在这里失败。
 */
const decodeAudio = async (bytes: ArrayBuffer): Promise<AudioBuffer> => {
  const context = new AudioContext({ sampleRate: SAMPLE_RATE });

  try {
    return await context.decodeAudioData(bytes);
  } catch {
    throw new Error(
      '这个视频的音轨解不出来（片子可能没有声音，或浏览器不支持它的音频编码），可先用外部播放器打开再另存音频',
    );
  } finally {
    await context.close();
  }
};

/**
 * 把解码结果统一成「最多双声道 + 48k」：声道按 WebAudio 的混音规则压下来，
 * 采样率没跟上（个别浏览器不认上下文给的 sampleRate）时再走一次离线渲染，
 * 免得时间戳按 48k 算、声音却按 44.1k 播，整段被拉快。
 */
const prepareBuffer = async (buffer: AudioBuffer): Promise<AudioBuffer> => {
  const channels = Math.min(MAX_CHANNELS, buffer.numberOfChannels);

  if (channels === buffer.numberOfChannels && buffer.sampleRate === SAMPLE_RATE) {
    return buffer;
  }

  const offline = new OfflineAudioContext(
    channels,
    Math.max(1, Math.ceil(buffer.duration * SAMPLE_RATE)),
    SAMPLE_RATE,
  );
  const source = offline.createBufferSource();

  source.buffer = buffer;
  source.connect(offline.destination);
  source.start();

  return offline.startRendering();
};

/** 让出一次事件循环：编码队列积压时用，顺带让进度条与取消按钮能响应 */
const yieldToLoop = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

/**
 * 把整段 PCM 逐帧喂给 `AudioEncoder`，编码结果实时交给 muxer。
 * 帧按 `f32-planar` 排：先铺满第 1 个声道的全部采样，再铺第 2 个。
 *
 * 用递归而不是 `for` 循环推进：队列积压时要 `await` 让出事件循环，
 * 一次只推进一帧，既不用在循环里 `await`，也不会把整段 PCM 同步压进编码队列。
 */
const encodeFrom = async (
  buffer: AudioBuffer,
  encoder: AudioEncoder,
  options: ExtractAudioOptions,
  readError: () => Error | null,
  start: number,
): Promise<void> => {
  const channels = buffer.numberOfChannels;
  const total = buffer.length;

  if (start >= total) {
    return;
  }

  if (options.signal?.aborted) {
    throw new Error('已取消');
  }

  const failed = readError();

  if (failed !== null) {
    throw failed;
  }

  const frames = Math.min(FRAME_SAMPLES, total - start);
  const planes = new Float32Array(frames * channels);

  /** 声道数最多 2，编号用一次性的小数组铺开，避开 `for` 语句 */
  Array.from({ length: channels }, (_, channel) => channel).forEach((channel) => {
    planes.set(
      buffer.getChannelData(channel).subarray(start, start + frames),
      channel * frames,
    );
  });

  const audioData = new AudioData({
    data: planes,
    format: 'f32-planar',
    numberOfChannels: channels,
    numberOfFrames: frames,
    sampleRate: SAMPLE_RATE,
    timestamp: Math.round((start / SAMPLE_RATE) * 1e6),
  });

  encoder.encode(audioData);
  audioData.close();

  options.onProgress?.((start + frames) / total);

  if (encoder.encodeQueueSize > MAX_QUEUED_FRAMES) {
    await yieldToLoop();
  }

  await encodeFrom(buffer, encoder, options, readError, start + FRAME_SAMPLES);
};

/**
 * 抽出音轨并封装成 WebM。
 *
 * @param src 视频地址（预览里同一个 `src`）
 * @throws 读取失败、解码失败、浏览器不支持 WebCodecs、取消
 */
export const extractAudio = async (
  src: string,
  options: ExtractAudioOptions = {},
): Promise<Blob> => {
  if (typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') {
    throw new Error('当前浏览器不支持音频导出（需要 Chrome / Edge 这类支持 WebCodecs 的浏览器）');
  }

  const bytes = await readVideoBytes(src, options.signal);
  const decoded = await decodeAudio(bytes);
  const buffer = await prepareBuffer(decoded);

  if (buffer.length === 0 || buffer.numberOfChannels === 0) {
    throw new Error('没有抽出可用的音轨');
  }

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    audio: {
      codec: 'A_OPUS',
      numberOfChannels: buffer.numberOfChannels,
      sampleRate: SAMPLE_RATE,
    },
    target,
  });
  let encodeError: Error | null = null;

  const encoder = new AudioEncoder({
    error: (error) => {
      encodeError = error instanceof Error ? error : new Error('音频编码失败');
    },
    output: (chunk, meta) => {
      muxer.addAudioChunk(chunk, meta);
    },
  });

  encoder.configure({
    bitrate: BIT_RATE,
    codec: 'opus',
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: SAMPLE_RATE,
  });

  try {
    await encodeFrom(buffer, encoder, options, () => encodeError, 0);
    await encoder.flush();
  } finally {
    encoder.close();
  }

  muxer.finalize();

  return new Blob([target.buffer], { type: 'audio/webm' });
};
