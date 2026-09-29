Add `withTimeout()` and `waitUntil()`.

`withTimeout(promise, label, options?)` bounds a promise with a deadline and rejects with a `TimeoutError` (`Timed out: <label>`) when it fires. `waitUntil(predicate, label, options?)` polls a predicate (first check immediate, then every `poll` ms) until truthy, rejecting on the deadline. Both accept an external `AbortSignal` and reject with `signal.reason` when it aborts.

```js
import {waitUntil, withTimeout} from "awaitery"

await withTimeout(work, "gateway registration", 10_000)
await waitUntil(() => client.status().virtualStreams === 0, "stream retired")
```
