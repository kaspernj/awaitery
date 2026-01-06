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
 * @param {object} opts Options.
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
  /** @type {object | undefined} */
  let options = opts

  /** @type {(() => (T | Promise<T>)) | undefined} */
  let resolvedCallback = callback

  if (typeof opts === "function") {
    resolvedCallback = opts
    options = undefined
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
