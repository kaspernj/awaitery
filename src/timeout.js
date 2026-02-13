// @ts-check

class TimeoutError extends Error {}

/**
 * @typedef {object} TimeoutArgs
 * @property {number} [timeout] - The timeout in milliseconds (default: 5000).
 * @property {string} [errorMessage] - The error message when timing out.
 */

/**
 * Runs a callback with a timeout.
 * @template T
 * @overload
 * @param {() => (T | Promise<T>)} callback - The callback to run.
 * @returns {Promise<T>} Resolves with the callback result.
 */
/**
 * Runs a callback with a timeout.
 * @template T
 * @overload
 * @param {TimeoutArgs} args - The arguments.
 * @param {() => (T | Promise<T>)} callback - The callback to run.
 * @returns {Promise<T>} Resolves with the callback result.
 */
/**
 * Runs a callback with a timeout.
 * @template T
 * @param {TimeoutArgs | (() => (T | Promise<T>))} arg1 - The arguments or the callback.
 * @param {() => (T | Promise<T>)} [arg2] - The callback when arguments are provided.
 * @returns {Promise<T>} Resolves with the callback result.
 */
export default async function timeout(arg1, arg2) {
  /** @type {TimeoutArgs | undefined} */
  let args

  /** @type {(() => (T | Promise<T>)) | undefined} */
  let callback

  if (typeof arg1 == "function" && arg2 === undefined) {
    args = {timeout: 5000}
    callback = arg1
  } else if (typeof arg1 == "object" && typeof arg2 == "function") {
    args = arg1
    callback = arg2
  }

  if (callback == undefined) throw new Error("Somehow callback is undefined")
  if (args == null || typeof args !== "object") throw new Error("Somehow args isn't an object")

  const {timeout: timeoutNumber = 5000, errorMessage = "Timeout while trying", ...restArgs} = args
  const restArgsKeys = Object.keys(restArgs)

  if (restArgsKeys.length > 0) throw new Error(`Unknown arguments given to timeout: ${restArgsKeys.join(", ")}`)

  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(errorMessage))
    }, timeoutNumber)
  })

  try {
    return await Promise.race([Promise.resolve().then(callback), timeoutPromise])
  } finally {
    clearTimeout(timeoutId)
  }
}
