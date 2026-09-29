// @ts-check

import {TimeoutError} from "./timeout.js"

/**
 * @typedef {object} WithTimeoutOptions
 * @property {number} [timeout] - The timeout in milliseconds (default: 4000).
 * @property {string} [errorMessage] - The error message when the deadline is reached.
 * @property {AbortSignal} [signal] - External AbortSignal composed with the deadline. When it aborts, the run rejects with `signal.reason` and no result is returned.
 */

/**
 * Bounds a promise with a deadline.
 *
 * Resolves with the promise's result if it settles first. Rejects with a
 * `TimeoutError` (message: `Timed out: <label>`) when the deadline is reached
 * first, or with `signal.reason` when an external signal aborts first. The
 * promise is never cancelled — it keeps running if it settles after the
 * deadline, but its late result no longer reaches the caller.
 *
 * @template T
 * @overload
 * @param {Promise<T>} promise - The promise to bound.
 * @param {string} label - The label for the timeout error.
 * @returns {Promise<T>} Resolves with the promise's result.
 */
/**
 * Bounds a promise with a deadline.
 * @template T
 * @overload
 * @param {Promise<T>} promise - The promise to bound.
 * @param {string} label - The label for the timeout error.
 * @param {number} timeout - The timeout in milliseconds (default: 4000).
 * @returns {Promise<T>} Resolves with the promise's result.
 */
/**
 * Bounds a promise with a deadline.
 * @template T
 * @overload
 * @param {Promise<T>} promise - The promise to bound.
 * @param {string} label - The label for the timeout error.
 * @param {WithTimeoutOptions} options - The options.
 * @returns {Promise<T>} Resolves with the promise's result.
 */
/**
 * Bounds a promise with a deadline.
 * @template T
 * @param {Promise<T>} promise - The promise to bound.
 * @param {string} label - The label for the timeout error.
 * @param {WithTimeoutOptions | number} [args] - Options, or the timeout in milliseconds when a plain number is passed.
 * @returns {Promise<T>} Resolves with the promise's result.
 */
export default async function withTimeout(promise, label, args) {
  /** @type {WithTimeoutOptions | undefined} */
  let options

  if (typeof args === "number") options = {timeout: args}
  else if (args !== undefined) options = args

  const {timeout: timeoutNumber = 4000, errorMessage, signal, ...restOpts} = options ?? {}
  const restOptsKeys = Object.keys(restOpts)

  if (restOptsKeys.length > 0) throw new Error(`Unknown arguments given to withTimeout: ${restOptsKeys.join(", ")}`)

  const message = errorMessage ?? `Timed out: ${label}`

  if (signal?.aborted) {
    return Promise.reject(signal.reason)
  }

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timeoutId

  /** @type {(() => void) | undefined} */
  let onExternalAbort

  const deadline = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      if (signal && onExternalAbort) signal.removeEventListener("abort", onExternalAbort)

      const timeoutError = new TimeoutError(message)

      reject(timeoutError)
    }, timeoutNumber)

    if (signal) {
      onExternalAbort = () => {
        clearTimeout(timeoutId)

        reject(signal.reason)
      }

      signal.addEventListener("abort", onExternalAbort)
    }
  })

  return Promise.race([Promise.resolve(promise), deadline])
}
