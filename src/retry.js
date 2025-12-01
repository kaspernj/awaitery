import timeout from "./timeout.js"
import wait from "./wait.js"

/**
 * Retries a callback until it succeeds or the timeout is reached.
 * @param {function() : void} callback - The callback to retry.
 * @returns {void}
 */
/**
 * Retries a callback until it succeeds or the timeout is reached.
 * @param {object} args - The arguments.
 * @param {number} args.timeout - The timeout in milliseconds
 * @param {number} args.tries - The number of tries (default: 3)
 * @param {number} args.wait - The wait time in milliseconds between tries (default: 50)
 * @param {function() : void} callback - The callback to retry.
 * @returns {void}
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

  const {timeout: timeoutNumber = null, tries = 3, wait: waitNumber = null, ...restArgs} = args

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
        if (waitNumber > 0) {
          await wait(waitNumber)
        }
      } else {
        throw error
      }
    }
  }
}
