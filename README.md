# Awaitery

## Usage

## deferred

Create a promise whose resolve and reject functions can be called externally. This is useful for deterministic synchronization between concurrent operations.

```js
import deferred from "awaitery/build/deferred.js"

const ready = deferred()

startWork().then(ready.resolve, ready.reject)
await ready.promise
```

## retry

Retry a callback until it succeeds or you exhaust the configured tries (default 3); optionally wrap each attempt in a timeout and wait between failed attempts. Defaults to 3 tries with no timeout and no wait unless you pass options.

```js
import retry from "awaitery/src/retry.js"

await retry({tries: 3, wait: 1000, timeout: 4000}, async () => {
  const submitButton = await systemTest.findByTestID("signInButton")

  await systemTest.click(submitButton)
})

await retry(async () => {
  const submitButton = await systemTest.findByTestID("signInButton")

  await systemTest.click(submitButton)
})
```

### Cancellation and conditional retries

Pass a `signal` to cancel cooperatively and a `shouldRetry` predicate to stop early on non-retryable errors. `shouldRetry` receives a forward-compatible object argument (including the external `signal`) and may be async:

```js
const controller = new AbortController()

await retry({tries: 5, wait: 1000, timeout: 4000, signal: controller.signal, shouldRetry: ({error, tryNumber, tries, signal}) => {
  if (error instanceof PermanentError) return false // rethrow immediately, no further attempts or delay

  return true
}}, async ({control}) => {
  // `control.signal` aborts on the per-attempt timeout or when `controller` aborts.
  await fetch(url, {signal: control.signal})
})

controller.abort() // no new attempt starts and any in-progress retry delay is cancelled
```

The callback's context depends on whether a `timeout` is set. With a `timeout`, it receives `{control}` (a `TimeoutControl`). Without a `timeout`, it receives `{signal}` — the external `AbortSignal` (or `undefined` when none was passed) — so owned work can still cooperate with cancellation:

```js
await retry({tries: 5, wait: 1000, signal: controller.signal}, async ({signal}) => {
  await fetch(url, {signal}) // cancels when `controller` aborts
})
```

When cancelled, `retry()` rejects with `signal.reason`. Cancellation always wins: a non-cooperative callback (or `shouldRetry`) that resolves after the abort cannot override it. When `signal` is combined with `timeout`, the external signal is composed into the per-attempt `TimeoutControl` so the callback observes both the deadline and external cancellation through `control.signal`.

## timeout

Run a callback with a hard timeout; if the timer wins, a `TimeoutError` is thrown, otherwise the callback’s return value is yielded. Defaults to a 5000ms timeout when called without options.

```js
import timeout from "awaitery/src/timeout.js"

await timeout({timeout: 4000}, async () => {
  const submitButton = await systemTest.findByTestID("signInButton")

  await systemTest.click(submitButton)
})

await timeout(async () => {
  const submitButton = await systemTest.findByTestID("signInButton")

  await systemTest.click(submitButton)
})
```

Pass an external `signal` to cancel before the deadline. It is composed with the timeout: whichever fires first wins. A timeout rejects with a `TimeoutError`; external cancellation rejects with `signal.reason`. In both cases `control.signal` aborts with that same value, and every timer and listener is cleaned up:

```js
const controller = new AbortController()

const promise = timeout({timeout: 4000, signal: controller.signal}, async ({control}) => {
  await fetch(url, {signal: control.signal})
})

controller.abort(new Error("navigated away")) // rejects `promise` with that exact error
```

Between async steps the callback can call `control.check()` to bail early: it throws immediately if `control.signal` has aborted (surfacing the external `signal.reason`, even before the deadline) and otherwise throws a `TimeoutError` once the deadline has passed.

`TimeoutError` is exported from the timeout module so callers can distinguish a
deadline from errors thrown by the callback:

```js
import timeout, {TimeoutError} from "awaitery/build/timeout.js"

try {
  await timeout({timeout: 4000}, runOperation)
} catch (error) {
  if (error instanceof TimeoutError) handleTimeout(error)
  else throw error
}
```

## wait

Sleep for the given milliseconds. Pass an `AbortSignal` to cancel the sleep early:

```js
import wait from "awaitery/src/wait.js"

await wait(1000)

const controller = new AbortController()

setTimeout(() => controller.abort(), 100)
await wait(1000, {signal: controller.signal}) // rejects with signal.reason after ~100ms
```

If the signal is already aborted the returned promise rejects immediately; otherwise it clears its timer and removes its listener when either the delay elapses or the signal aborts. The rejection value is `signal.reason` — the platform's `AbortError` (a `DOMException`) when you abort without an explicit reason.

## waitFor

Keep retrying a callback while it throws (or rejects) until it eventually succeeds or a timeout is reached; uses a small delay between attempts and rethrows the last error on timeout.
Options must be passed as the first argument when provided.

```js
import waitFor from "awaitery/src/wait-for.js"

await waitFor(async () => {
  if (await fileExists(targetPath)) throw new Error("Target file exists")
})

await waitFor({timeout: 2000, wait: 100}, async () => {
  if (await fileExists(targetPath)) throw new Error("Target file exists")
})
```

Pass a `signal` to cancel while waiting. External cancellation is reflected in the callback's `control.signal`, the delay between attempts is cancellation-aware, and no new callback starts once cancelled. A callback that ignores its signal and resolves after cancellation or the deadline cannot win — the cancellation reason (or a `TimeoutError`) is surfaced instead of that stale success. `waitFor()` then rejects with `signal.reason`:

```js
const controller = new AbortController()

await waitFor({timeout: 2000, wait: 100, signal: controller.signal}, async ({control}) => {
  await fetch(url, {signal: control.signal})
})
```
