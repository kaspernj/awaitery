import wait from "./wait.js"

/**
 * Waits for a callback to run without throwing an error and retries until the timeout is reached.
 * @param {function() : void} callback - The callback.
 * @param {object} opts - Options.
 * @param {number} opts.timeout - The timeout in milliseconds (default: 5000)
 * @param {number} opts.wait - The wait time in milliseconds (default: 50)
 * @returns {void}
 */
export default async function waitFor(callback, opts) {
  const waitTimeout = opts?.timeout || 5000
  const waitTime = opts?.wait || 50
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
