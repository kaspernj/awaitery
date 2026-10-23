Per-error-type retry decisions and retry observation in `retry`.

- `shouldRetry` may return (or resolve to) a `{retry, wait}` decision instead of a plain boolean: `{retry: false}` refuses the retry, while `{retry: true, wait: 15000}` retries with a delay owned by that error type. Booleans keep their existing meaning, so existing call sites are unaffected.
- `wait` also accepts a schedule callback (`({error, tryNumber, tries, signal}) => number | Promise<number>`) as well as a fixed number of milliseconds, so a backoff can grow per attempt or differ per error class.
- New `onRetry({error, tryNumber, tries, wait, signal})` observer runs after a retry was accepted and before its delay, with the resolved delay, so callers can log or emit the attempt instead of re-implementing the loop around `retry`. It may be async, and its errors are not swallowed — they reject the run.
- Cancellation still wins: an abort observed inside `shouldRetry`, a wait schedule or `onRetry` rejects with `signal.reason` instead of allowing another attempt or delay.
