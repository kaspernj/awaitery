// @ts-check

import {TimeoutError} from "./timeout.js"
import wait from "./wait.js"

/**
 * @typedef {object} WaitUntilOptions
 * @property {number} [timeout] - The total deadline in milliseconds (default: 8000).
 * @property {number} [poll] - The interval between checks in milliseconds (default: 10).
 * @property {string} [errorMessage] - The error message when the deadline is reached.
 * @property {AbortSignal} [signal] - External AbortSignal. When it aborts, no further checks start and the run rejects with `signal.reason`.
 */

/**
 * Polls a predicate until it returns a truthy value, or the deadline is reached.
 *
 * The first check is immediate, then the predicate is re-checked every
 * `poll` milliseconds until `timeout` elapses. Resolves with the first truthy
 * value, or rejects with a `TimeoutError` (message: `Timed out: <label>`)
 * when the deadline passes. If the predicate throws, that error is rethrown —
 * polling does not swallow it.
 *
 * @template T
 * @overload
 * @param {() => (T | Promise<T>)} predicate - The check to poll.
 * @param {string} label - The label for the timeout error.
 * @returns {Promise<T>} Resolves with the first truthy value.
 */
/**
 * Polls a predicate until it returns a truthy value, or the deadline is reached.
 * @template T
 * @overload
 * @param {() => (T | Promise<T>)} predicate - The check to poll.
 * @param {string} label - The label for the timeout error.
 * @param {number} timeout - The total deadline in milliseconds (default: 8000).
 * @returns {Promise<T>} Resolves with the first truthy value.
 */
/**
 * Polls a predicate until it returns a truthy value, or the deadline is reached.
 * @template T
 * @overload
 * @param {() => (T | Promise<T>)} predicate - The check to poll.
 * @param {string} label - The label for the timeout error.
 * @param {WaitUntilOptions} options - The options.
 * @returns {Promise<T>} Resolves with the first truthy value.
 */
/**
 * Polls a predicate until it returns a truthy value, or the deadline is reached.
 * @template T
 * @param {() => (T | Promise<T>)} predicate - The check to poll.
 * @param {string} label - The label for the timeout error.
 * @param {WaitUntilOptions | number} [args] - Options, or the total deadline in milliseconds when a plain number is passed.
 * @returns {Promise<T>} Resolves with the first truthy value.
 */
export default async function waitUntil(predicate, label, args) {
  /** @type {WaitUntilOptions | undefined} */
  let options

  if (typeof args === "number") options = {timeout: args}
  else if (args !== undefined) options = args

  const {timeout: totalTimeout = 8000, poll: pollTime = 10, errorMessage, signal, ...restOpts} = options ?? {}
  const restOptsKeys = Object.keys(restOpts)

  if (restOptsKeys.length > 0) throw new Error(`Unknown arguments given to waitUntil: ${restOptsKeys.join(", ")}`)

  const message = errorMessage ?? `Timed out: ${label}`

  if (signal?.aborted) {
    throw signal.reason
  }

  const deadline = Date.now() + totalTimeout

  while (true) {
    if (signal?.aborted) throw signal.reason

    const value = await predicate()

    if (value) return value

    if (Date.now() >= deadline) break

    await wait(pollTime, {signal})
  }

  throw new TimeoutError(message)
}

export {TimeoutError}
