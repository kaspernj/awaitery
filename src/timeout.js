// @ts-check

class TimeoutError extends Error {}

/**
 * Runs a callback with a timeout.
 * @template T
 * @param {object} args - The arguments.
 * @param {number} args.timeout - The timeout in milliseconds.
 * @param {() => (T | Promise<T>)} callback - The callback to run.
 * @returns {Promise<T>} Resolves with the callback result.
 */
export default async function timeout(args, callback) {
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
