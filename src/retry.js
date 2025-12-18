// @ts-check

import timeout from "./timeout.js"
import wait from "./wait.js"

/**
 * @typedef {object} RetryArgs
 * @property {number} [timeout] The timeout in milliseconds
 * @property {number} [tries] The number of tries (default: 3)
 * @property {number} [wait] The wait time in milliseconds between tries (default: 50)
 */

/**
 * @typedef {function() : void} RetryCallback
 */

/**
 * Retries a callback until it succeeds or the timeout is reached without arguments.
 * @overload
 * @param {RetryCallback} arg1 - The callback to retry.
 * @param {undefined} [arg2]
 * @returns {void}
 */
/**
 * Retries a callback until it succeeds or the timeout is reached with arguments.
 * @overload
 * @param {RetryArgs} arg1 - The arguments.
 * @param {RetryCallback} arg2 - The callback to retry.
 * @returns {Promise<void>}
 */
/**
 * @param {RetryArgs | RetryCallback} arg1
 * @param {undefined | RetryCallback} arg2
 * @returns {Promise<void>}
 */
export default async function retry(arg1, arg2) {
  /** @type {RetryArgs | undefined} */
  let args

  /** @type {RetryCallback | undefined} */
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

  const {timeout: timeoutNumber = null, tries = 3, wait: waitNumber = undefined, ...restArgs} = args
  const restArgsKeys = Object.keys(restArgs)

  if (restArgsKeys.length > 0) throw new Error(`Unknown arguments given to retry: ${restArgsKeys.join(", ")}`)

  for (let tryNumber = 1; tryNumber <= tries; tryNumber++) {
    try {
      if (timeoutNumber) {
        return await timeout({timeout: timeoutNumber}, callback)
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
