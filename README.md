# Awaitery

## Usage

## retry

Retry a callback until it succeeds or you exhaust the configured tries (default 3); optionally wrap each attempt in a timeout and wait between failed attempts.

```js
import retry from "awaitery/src/retry.js"

await retry({tries: 3, wait: 1000, timeout: 4000}, async () => {
  const submitButton = await systemTest.findByTestID("signInButton")

  await systemTest.click(submitButton)
})
```

## timeout

Run a callback with a hard timeout; if the timer wins, a `TimeoutError` is thrown, otherwise the callback’s return value is yielded.

```js
import timeout from "awaitery/src/timeout.js"

await timeout({timeout: 4000}, async () => {
  const submitButton = await systemTest.findByTestID("signInButton")

  await systemTest.click(submitButton)
})
```

## wait

Sleep for the given milliseconds.

```js
import wait from "awaitery/src/wait.js"

await wait(1000)
```

## waitFor

Keep retrying a callback while it throws (or rejects) until it eventually succeeds or a timeout is reached; uses a small delay between attempts and rethrows the last error on timeout.

```js
import waitFor from "awaitery/src/wait-for.js"

await waitFor(async () => {
  if (await fileExists(targetPath)) throw new Error("Target file exists")
})
```
