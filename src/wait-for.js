// @ts-check

import wait from "./wait.js"

/**
 * @typedef {object} WaitForOptions
 * @property {number} [timeout] The timeout in milliseconds (default: 5000).
 * @property {number} [wait] The wait time in milliseconds (default: 50).
 */

/**
 * Waits for a callback to run without throwing an error and retries until the timeout is reached.
 * @template T
 * @overload
 * @param {() => (T | Promise<T>)} callback The callback.
 * @returns {Promise<T>} Resolves with the callback result.
 */
/**
 * Waits for a callback to run without throwing an error and retries until the timeout is reached.
 * @template T
 * @overload
 * @param {WaitForOptions} opts Options.
 * @param {() => (T | Promise<T>)} callback The callback.
 * @returns {Promise<T>} Resolves with the callback result.
 */
/**
 * Waits for a callback to run without throwing an error and retries until the timeout is reached.
 * @template T
 * @param {WaitForOptions | (() => (T | Promise<T>))} opts Options or the callback when no options are provided.
 * @param {() => (T | Promise<T>)} [callback] The callback.
 * @returns {Promise<T>} Resolves with the callback result.
 */
export default async function waitFor(opts, callback) {
  /** @type {WaitForOptions | undefined} */
  let options

  /** @type {(() => (T | Promise<T>)) | undefined} */
  let resolvedCallback = callback

  if (typeof opts === "function") {
    resolvedCallback = opts
  } else {
    options = opts
  }

  if (resolvedCallback == undefined) throw new Error("Somehow callback is undefined")

  const {timeout: waitTimeout = 5000, wait: waitTime = 50, ...restOpts} = options || {}
  const restOptsKeys = Object.keys(restOpts)

  if (restOptsKeys.length > 0) throw new Error(`Unknown arguments given to waitFor: ${restOptsKeys.join(", ")}`)
  const startTime = Date.now()
  const endTime = startTime + waitTimeout
  let lastError

  while (Date.now() < endTime) {
    try {
      return await resolvedCallback()
    } catch (error) {
      lastError = error
    }
    await wait(waitTime)
  }

  if (lastError) {
    throw lastError
  }
}
