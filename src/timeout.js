// @ts-check

class TimeoutError extends Error {}

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
 * @param {object} args - The arguments.
 * @param {number} args.timeout - The timeout in milliseconds (default: 5000).
 * @param {() => (T | Promise<T>)} callback - The callback to run.
 * @returns {Promise<T>} Resolves with the callback result.
 */
/**
 * Runs a callback with a timeout.
 * @template T
 * @param {object | (() => (T | Promise<T>))} arg1 - The arguments or the callback.
 * @param {() => (T | Promise<T>)} [arg2] - The callback when arguments are provided.
 * @returns {Promise<T>} Resolves with the callback result.
 */
export default async function timeout(arg1, arg2) {
  /** @type {object | undefined} */
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

  const {timeout: timeoutNumber, ...restArgs} = args
  const restArgsKeys = Object.keys(restArgs)

  if (restArgsKeys.length > 0) throw new Error(`Unknown arguments given to timeout: ${restArgsKeys.join(", ")}`)

  let result
  let timeoutReached = false

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      timeoutReached = true
      resolve(undefined)
    }, timeoutNumber)
  })

  const callbackPromise = new Promise(async (resolve, reject) => { // eslint-disable-line no-async-promise-executor
    try {
      result = await callback()
      resolve(undefined)
    } catch (error) {
      reject(error)
    }
  })

  await Promise.race([timeoutPromise, callbackPromise])

  if (timeoutReached) {
    throw new TimeoutError("Timeout while trying")
  }

  return result
}
