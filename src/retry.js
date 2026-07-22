// @ts-check

import timeout from "./timeout.js"
import wait from "./wait.js"

/**
 * @callback ShouldRetry
 * @param {object} args Forward-compatible object argument.
 * @param {unknown} args.error The error thrown by the failed attempt.
 * @param {number} args.tryNumber The 1-based number of the attempt that just failed.
 * @param {number} args.tries The total configured number of tries.
 * @param {AbortSignal | undefined} args.signal The external AbortSignal, if one was provided, so the predicate can cooperate with cancellation. Cancellation observed while it runs wins over its result.
 * @returns {boolean | Promise<boolean>} Whether another attempt should be made.
 */

/**
 * @typedef {object} RetryArgs
 * @property {number} [timeout] The timeout in milliseconds
 * @property {number} [tries] The number of tries (default: 3)
 * @property {number} [wait] The wait time in milliseconds between tries (default: 50)
 * @property {string} [timeoutErrorMessage] The error message when timing out
 * @property {AbortSignal} [signal] External AbortSignal. When it aborts, no new attempt starts, an in-progress retry delay is cancelled, and the run rejects with `signal.reason`. Composed into the per-attempt TimeoutControl when a timeout is set.
 * @property {ShouldRetry} [shouldRetry] Object-argument predicate consulted before waiting/retrying after a failed attempt. It receives the external `signal` and may be async. Returning (or resolving to) `false` rethrows the current error without another attempt or delay; a cancellation observed while it runs wins over that rethrow.
 */

/**
 * @template T
 * @typedef {((args: {signal?: AbortSignal}) => (T | Promise<T>)) | ((args: {control: import("./timeout.js").TimeoutControl}) => (T | Promise<T>))} RetryCallback
 */

/**
 * Retries without arguments or timeout.
 * @template T
 * @overload
 * @param {(args: {signal?: AbortSignal}) => (T | Promise<T>)} callback The callback; receives a forward-compatible `{signal}` object (`signal` is undefined here).
 * @returns {Promise<T>}
 */
/**
 * Retries without a timeout — callback receives no TimeoutControl, only the forward-compatible `{signal}` object.
 * @template T
 * @overload
 * @param {Omit<RetryArgs, 'timeout'>} args
 * @param {(args: {signal?: AbortSignal}) => (T | Promise<T>)} callback The callback; receives `{signal}` so it can cooperate with external cancellation.
 * @returns {Promise<T>}
 */
/**
 * Retries with a timeout — callback always receives a defined TimeoutControl.
 * @template T
 * @overload
 * @param {RetryArgs & {timeout: number}} args
 * @param {(args: {control: import("./timeout.js").TimeoutControl}) => (T | Promise<T>)} callback
 * @returns {Promise<T>}
 */
/**
 * @template T
 * @param {RetryArgs | RetryCallback<T>} arg1 The arguments or the callback. (Implementation signature; callers match one of the overloads above.)
 * @param {RetryCallback<T>} [arg2] The callback when arguments are provided.
 * @returns {Promise<T>} Resolves with the callback result.
 */
export default async function retry(arg1, arg2) {
  /** @type {RetryArgs | undefined} */
  let args

  /** @type {RetryCallback<T> | undefined} */
  let callback

  if (typeof arg1 == "function" && arg2 === undefined) {
    args = {}
    callback = arg1
  } else if (typeof arg1 == "object" && typeof arg2 == "function") {
    args = arg1
    callback = arg2
  }

  if (callback == undefined) throw new Error("Somehow callback is undefined")
  if (typeof args !== "object") throw new Error("Somehow args isn't an object")

  const {
    timeout: timeoutNumber = null,
    tries = 3,
    wait: waitNumber = undefined,
    timeoutErrorMessage,
    signal,
    shouldRetry,
    ...restArgs
  } = args
  const restArgsKeys = Object.keys(restArgs)

  if (restArgsKeys.length > 0) throw new Error(`Unknown arguments given to retry: ${restArgsKeys.join(", ")}`)

  for (let tryNumber = 1; tryNumber <= tries; tryNumber++) {
    // Don't start a new attempt after cancellation.
    if (signal?.aborted) throw signal.reason

    try {
      if (timeoutNumber != null) {
        const timedCallback = /** @type {(args: {control: import("./timeout.js").TimeoutControl}) => (T | Promise<T>)} */ (callback)

        return await timeout({timeout: timeoutNumber, errorMessage: timeoutErrorMessage, signal}, timedCallback)
      } else {
        // Without a per-attempt timeout there is no TimeoutControl, but the callback can still
        // cooperate with external cancellation through the forward-compatible {signal} argument.
        const signalCallback = /** @type {(args: {signal?: AbortSignal}) => (T | Promise<T>)} */ (callback)
        const result = await signalCallback({signal})

        // A callback that ignored its signal may resolve after cancellation; cancellation must win
        // over this now-stale success.
        if (signal?.aborted) throw signal.reason

        return result
      }
    } catch (error) {
      // Cancellation takes precedence over retrying: surface the reason instead of retrying.
      if (signal?.aborted) throw signal.reason
      if (tryNumber >= tries) throw error

      if (shouldRetry) {
        // shouldRetry may be async and observe the external signal; a cancellation seen while it runs
        // must win over both rethrowing the current error and starting another attempt or delay.
        const retryAllowed = await shouldRetry({error, tryNumber, tries, signal})

        if (signal?.aborted) throw signal.reason
        if (!retryAllowed) throw error
      }

      if (waitNumber !== undefined && waitNumber > 0) {
        // Cancellation-aware delay: an abort here rejects with signal.reason.
        await wait(waitNumber, {signal})
      }
    }
  }
}
