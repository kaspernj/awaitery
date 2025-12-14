// @ts-check

class TimeoutError extends Error {}

/**
 * Runs a callback with a timeout.
 * @param {object} args - The arguments.
 * @param {number} args.timeout - The timeout in milliseconds.
 * @param {function() : void} callback - The callback to run.
 * @returns {Promise<void>}
 */
export default async function timeout(args, callback) {
  const {timeout: timeoutNumber, ...restArgs} = args
  const restArgsKeys = Object.keys(restArgs)

  if (restArgsKeys.length > 0) throw new Error(`Unknown arguments given to timeout: ${restArgsKeys.join(", ")}`)

  let result
  let timeoutReached = false

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => { // eslint-disable-line no-undef
      timeoutReached = true
      resolve(undefined)
    }, timeoutNumber)
  })

  const callbackPromise = new Promise(async (resolve, reject) => {
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
