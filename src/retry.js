// @ts-check

import timeout from "./timeout.js"
import wait from "./wait.js"

/**
 * @typedef {object} RetryArgs
 * @property {number} [timeout] The timeout in milliseconds
 * @property {number} [tries] The number of tries (default: 3)
 * @property {number} [wait] The wait time in milliseconds between tries (default: 50)
 * @property {string} [timeoutErrorMessage] The error message when timing out
 */

/**
 * Retries without arguments or timeout.
 * @template T
 * @overload
 * @param {() => (T | Promise<T>)} callback
 * @returns {Promise<T>}
 */
/**
 * Retries without a timeout — callback receives no TimeoutControl.
 * @template T
 * @overload
 * @param {Omit<RetryArgs, 'timeout'>} args
 * @param {() => (T | Promise<T>)} callback
 * @returns {Promise<T>}
 */
/**
 * Retries with a timeout — callback always receives a defined TimeoutControl.
 * @template T
 * @overload
 * @param {RetryArgs & {timeout: number}} args
 * @param {(control: import("./timeout.js").TimeoutControl) => (T | Promise<T>)} callback
 * @returns {Promise<T>}
 */
/**
 * @template T
 * @param {RetryArgs | ((control?: import("./timeout.js").TimeoutControl) => (T | Promise<T>))} arg1 The arguments or the callback.
 * @param {(control?: import("./timeout.js").TimeoutControl) => (T | Promise<T>)} [arg2] The callback when arguments are provided.
 * @returns {Promise<T>} Resolves with the callback result.
 */
export default async function retry(arg1, arg2) {
  /** @type {RetryArgs | undefined} */
  let args

  /** @type {((control?: import("./timeout.js").TimeoutControl) => (T | Promise<T>)) | undefined} */
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
    ...restArgs
  } = args
  const restArgsKeys = Object.keys(restArgs)

  if (restArgsKeys.length > 0) throw new Error(`Unknown arguments given to retry: ${restArgsKeys.join(", ")}`)

  for (let tryNumber = 1; tryNumber <= tries; tryNumber++) {
    try {
      if (timeoutNumber) {
        return await timeout({timeout: timeoutNumber, errorMessage: timeoutErrorMessage}, callback)
      } else {
        return await callback()
      }
    } catch (error) {
      if (tryNumber < tries) {
        if (waitNumber !== undefined && waitNumber > 0) {
          await wait(waitNumber)
        }
      } else {
        throw error
      }
    }
  }
}
