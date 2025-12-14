// @ts-check

import timeout from "./timeout.js"
import wait from "./wait.js"

/**
 * Retries a callback until it succeeds or the timeout is reached.
 * @param {function() : void} arg1 - The callback to retry.
 * @param {undefined} arg2
 * @returns {void}
 */
/**
 * Retries a callback until it succeeds or the timeout is reached.
 * @param {object} arg1 - The arguments.
 * @param {number} arg1.timeout - The timeout in milliseconds
 * @param {number} arg1.tries - The number of tries (default: 3)
 * @param {number} arg1.wait - The wait time in milliseconds between tries (default: 50)
 * @param {function() : void} arg2 - The callback to retry.
 * @returns {Promise<void>}
 */
export default async function retry(arg1, arg2) {
  let args, callback

  if (typeof arg1 == "function" && arg2 === undefined) {
    args = {}
    callback = arg1
  } else {
    args = arg1
    callback = arg2
  }

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
