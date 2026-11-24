/**
 * 拖拽移动的落位音效：一声短促、低沉的「落定」响声。
 * 用 WebAudio 现场合成两段极短的音（低频下滑的正弦 + 一小撮衰减噪点），
 * 不引入任何音频素材，避免版权与包体；听感上就是东西轻轻落进盒子。
 *
 * 音效只是「这次移动已经提交」的听觉确认——浏览器不支持 WebAudio、
 * 或音频策略把播放请求拦下来时静默跳过，移动本身的结果不受影响。
 */

/** 复用同一个上下文：连续拖拽不重复新建（浏览器同时存在的音频上下文有上限） */
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (audioContext !== null) {
    return audioContext;
  }

  audioContext = new AudioContext();

  return audioContext;
};

/** 极短的指数衰减包络：6ms 起音，`duration` 内落到听不见 */
const decayEnvelope = (
  context: AudioContext,
  peak: number,
  duration: number,
): GainNode => {
  const gain = context.createGain();
  const now = context.currentTime;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  return gain;
};

/** 低频落点：正弦从 220Hz 滑到 118Hz，音量 130ms 内收掉 */
const playThump = (context: AudioContext): void => {
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = decayEnvelope(context, 0.16, 0.13);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(220, now);
  oscillator.frequency.exponentialRampToValueAtTime(118, now + 0.09);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.15);
};

/** 一点木头质感：40ms 带通噪点，压在落点音上，别盖过它 */
const playTick = (context: AudioContext): void => {
  const now = context.currentTime;
  const frames = Math.floor(context.sampleRate * 0.04);
  const buffer = context.createBuffer(1, frames, context.sampleRate);

  // 越靠后越轻，收尾不做硬切
  buffer.getChannelData(0).set(
    Array.from({ length: frames }, (_, index) => {
      const decay = 1 - index / frames;

      return (Math.random() * 2 - 1) * decay;
    }),
  );

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();

  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = 1400;
  filter.Q.value = 1.1;

  const gain = decayEnvelope(context, 0.05, 0.045);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(now);
  source.stop(now + 0.05);
};

/**
 * 在 drop 事件里先把音频上下文建好并恢复：真正播放要等移动请求回来，
 * 那时已经不在用户手势的任务里，单独 resume 可能被浏览器按自动播放策略拦下。
 */
export const primeMoveSound = (): void => {
  try {
    const context = getAudioContext();

    if (context.state !== 'running') {
      void context.resume();
    }
  } catch {
    // 建不出上下文就当没有音效，移动本身照常进行。
  }
};

/** 播放一次移动音效；建不出上下文或播放失败只跳过音效 */
export const playMoveSound = (): void => {
  try {
    const context = getAudioContext();

    if (context.state === 'suspended') {
      void context.resume();
    }

    playThump(context);
    playTick(context);
  } catch {
    // 音效是装饰，浏览器没有 WebAudio 时不该影响到移动本身。
  }
};
