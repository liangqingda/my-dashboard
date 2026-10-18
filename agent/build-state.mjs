const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Compare every marker by its position in the log, independent of configuration order. */
export function classifyBuild(config, log, running) {
  if (!running) return 'stopped';
  const ignored = (config.failIgnorePatterns ?? []).map(
    (pattern) => new RegExp(pattern, 'i'),
  );
  let success = -1;
  let failure = -1;
  for (const [markers, isFailure] of [
    [config.successMarkers ?? [], false],
    [config.failMarkers ?? [], true],
  ]) {
    for (const marker of markers) {
      const re = new RegExp(
        `(?<![A-Za-z0-9_])${escape(marker)}(?![A-Za-z0-9_])`,
        'ig',
      );
      for (const match of log.matchAll(re)) {
        const start = log.lastIndexOf('\n', match.index) + 1;
        const end = log.indexOf('\n', match.index);
        const line = log.slice(start, end < 0 ? log.length : end);
        if (isFailure && ignored.some((pattern) => pattern.test(line)))
          continue;
        if (isFailure) failure = Math.max(failure, match.index);
        else success = Math.max(success, match.index);
      }
    }
  }
  if (failure > success) return 'fail';
  return success >= 0 ? 'ok' : 'unknown';
}
