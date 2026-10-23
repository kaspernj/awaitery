// @ts-check

import timeout from "./timeout.js"
import wait from "./wait.js"

/**
 * @typedef {object} RetryDecision
 * @property {boolean} retry Whether another attempt should be made at all.
 * @property {number} [wait] Milliseconds to wait before that attempt, overriding the configured `wait`/wait schedule for this retry. A falsy or omitted wait retries immediately.
 */

/**
 * @callback ShouldRetry
 * @param {object} args Forward-compatible object argument.
 * @param {unknown} args.error The error thrown by the failed attempt.
 * @param {number} args.tryNumber The 1-based number of the attempt that just failed.
 * @param {number} args.tries The total configured number of tries.
 * @param {AbortSignal | undefined} args.signal The external AbortSignal, if one was provided, so the predicate can cooperate with cancellation. Cancellation observed while it runs wins over its result.
 * @returns {boolean | RetryDecision | Promise<boolean | RetryDecision>} Whether another attempt should be made, or a decision that also carries the delay for this specific error.
 */

/**
 * @callback WaitSchedule
 * @param {object} args Forward-compatible object argument.
 * @param {unknown} args.error The error thrown by the failed attempt.
 * @param {number} args.tryNumber The 1-based number of the attempt that just failed.
 * @param {number} args.tries The total configured number of tries.
 * @param {AbortSignal | undefined} args.signal The external AbortSignal, if one was provided.
 * @returns {number | Promise<number>} Milliseconds to wait before the next attempt.
 */

/**
 * @callback RetryObserver
 * @param {object} args Forward-compatible object argument.
 * @param {unknown} args.error The error thrown by the failed attempt.
 * @param {number} args.tryNumber The 1-based number of the attempt that just failed.
 * @param {number} args.tries The total configured number of tries.
 * @param {number} args.wait The resolved delay in milliseconds before the next attempt (0 when the retry is immediate).
 * @param {AbortSignal | undefined} args.signal The external AbortSignal, if one was provided.
 * @returns {void | Promise<void>}
 */

/**
 * @typedef {object} RetryArgs
 * @property {number} [timeout] The timeout in milliseconds
 * @property {number} [tries] The number of tries (default: 3)
 * @property {number | WaitSchedule} [wait] The wait time in milliseconds between tries, or a schedule callback computing the delay from the error that just failed and the attempt number. Omit for an immediate retry.
 * @property {string} [timeoutErrorMessage] The error message when timing out
 * @property {AbortSignal} [signal] External AbortSignal. When it aborts, no new attempt starts, an in-progress retry delay is cancelled, and the run rejects with `signal.reason`. Composed into the per-attempt TimeoutControl when a timeout is set.
 * @property {ShouldRetry} [shouldRetry] Object-argument predicate consulted before waiting/retrying after a failed attempt. It receives the external `signal` and may be async. Returning (or resolving to) `false` rethrows the current error without another attempt or delay; a `{retry, wait?}` decision can also own the delay for that error type. A cancellation observed while it runs wins over its result.
 * @property {RetryObserver} [onRetry] Observer called after a retry was accepted and before its delay, with the resolved wait, so callers can log/emit the attempt. It may be async; an error it throws rejects the run instead of being swallowed, and a cancellation observed while it runs wins over its result.
 */

/**
 * @template T
 * @typedef {(() => (T | Promise<T>)) | ((args: {signal: AbortSignal}) => (T | Promise<T>)) | ((args: {control: import("./timeout.js").TimeoutControl}) => (T | Promise<T>))} RetryCallback
 */

/**
 * Retries without arguments or timeout.
 * @template T
 * @overload
 * @param {() => (T | Promise<T>)} callback The callback; receives no arguments.
 * @returns {Promise<T>}
 */
/**
 * Retries without a timeout — callback receives `{signal}` only when an external signal is provided.
 * @template T
 * @overload
 * @param {Omit<RetryArgs, 'timeout'>} args
 * @param {(() => (T | Promise<T>)) | ((args: {signal: AbortSignal}) => (T | Promise<T>))} callback The callback; receives `{signal}` when external cancellation is requested, otherwise no arguments.
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
    wait: waitOption = undefined,
    timeoutErrorMessage,
    signal,
    shouldRetry,
    onRetry,
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
        // Preserve the legacy zero-argument call unless external cancellation was requested.
        const result = signal
          ? await /** @type {(args: {signal: AbortSignal}) => (T | Promise<T>)} */ (callback)({signal})
          : await /** @type {() => (T | Promise<T>)} */ (callback)()

        // A callback that ignored its signal may resolve after cancellation; cancellation must win
        // over this now-stale success.
        if (signal?.aborted) throw signal.reason

        return result
      }
    } catch (error) {
      // Cancellation takes precedence over retrying: surface the reason instead of retrying.
      if (signal?.aborted) throw signal.reason
      if (tryNumber >= tries) throw error

      /** @type {number | undefined} */
      let decisionWait

      if (shouldRetry) {
        // shouldRetry may be async and observe the external signal; a cancellation seen while it runs
        // must win over both rethrowing the current error and starting another attempt or delay.
        let retryAllowed

        try {
          retryAllowed = await shouldRetry({error, tryNumber, tries, signal})
        } catch (predicateError) {
          if (signal?.aborted) throw signal.reason
          throw predicateError
        }

        if (signal?.aborted) throw signal.reason

        if (typeof retryAllowed == "object") {
          // A decision can refuse the retry and/or own the delay for this error type.
          if (!retryAllowed.retry) throw error

          decisionWait = retryAllowed.wait
        } else if (!retryAllowed) {
          throw error
        }
      }

      /** @type {number} */
      let retryWaitMs

      if (decisionWait !== undefined) {
        retryWaitMs = decisionWait
      } else if (typeof waitOption == "function") {
        // A schedule may be async; cancellation seen while it runs wins over its result.
        retryWaitMs = await waitOption({error, tryNumber, tries, signal})

        if (signal?.aborted) throw signal.reason
      } else {
        retryWaitMs = waitOption ?? 0
      }

      if (onRetry) {
        // Observers may log/emit the retry; their errors are not swallowed. Cancellation still wins.
        try {
          await onRetry({error, tryNumber, tries, wait: retryWaitMs, signal})
        } catch (observerError) {
          if (signal?.aborted) throw signal.reason
          throw observerError
        }

        if (signal?.aborted) throw signal.reason
      }

      if (retryWaitMs > 0) {
        // Cancellation-aware delay: an abort here rejects with signal.reason.
        await wait(retryWaitMs, {signal})
      }
    }
  }
}
