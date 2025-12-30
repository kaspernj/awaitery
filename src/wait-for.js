// @ts-check

import wait from "./wait.js"

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
 * @param {object} [opts] Options.
 * @param {number} [opts.timeout] The timeout in milliseconds (default: 5000)
 * @param {number} [opts.wait] The wait time in milliseconds (default: 50)
 * @param {() => (T | Promise<T>)} callback The callback.
 * @returns {Promise<T>} Resolves with the callback result.
 */
/**
 * Waits for a callback to run without throwing an error and retries until the timeout is reached.
 * @template T
 * @param {object | (() => (T | Promise<T>))} opts Options or the callback when no options are provided.
 * @param {() => (T | Promise<T>)} [callback] The callback.
 * @returns {Promise<T>} Resolves with the callback result.
 */
export default async function waitFor(opts, callback) {
  if (typeof opts === "function") {
    callback = opts
    opts = undefined
  }

  const {timeout: waitTimeout = 5000, wait: waitTime = 50, ...restOpts} = opts || {}
  const restOptsKeys = Object.keys(restOpts)

  if (restOptsKeys.length > 0) throw new Error(`Unknown arguments given to waitFor: ${restOptsKeys.join(", ")}`)
  const startTime = new Date()
  const endTime = startTime.getTime() + waitTimeout
  let currentTime = new Date().getTime()
  let lastError

  while (currentTime < endTime) {
    currentTime = new Date().getTime()

    try {
      return await callback()
    } catch (error) {
      lastError = error
    }

    await wait(waitTime)
  }

  if (lastError) {
    throw lastError
  }
}
